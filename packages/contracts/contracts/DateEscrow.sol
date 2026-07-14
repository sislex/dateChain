// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DateEscrow
 * @notice Escrow for "dates for tokens". A proposer offers an amount to a payee;
 * on acceptance the amount is pulled from the proposer and locked. On confirm the
 * payee receives (100% - fee) and the service takes the fee. On cancel after
 * acceptance the service takes the fee and the proposer is refunded the rest.
 *
 * Lifecycle:
 *   propose ─▶ Proposed ─accept▶ Accepted ─confirm▶ Confirmed
 *                 │                  ├──────cancel▶ Cancelled (fee penalty)
 *                 │                  ├─cancelByPayee▶ Declined (full refund)
 *                 │                  └─claim (payee, after claimTimeout)▶ Confirmed
 *                 ├─decline▶ Declined
 *                 └─cancel──▶ Cancelled (no funds moved)
 */
contract DateEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status {
        None,
        Proposed,
        Accepted,
        Confirmed,
        Cancelled,
        Declined
    }

    struct Escrow {
        address proposer;
        address payee;
        uint256 amount;
        Status status;
        /// @notice When the payee accepted (0 until then); starts the claim timer.
        uint64 acceptedAt;
    }

    IERC20 public immutable token;
    address public serviceWallet;
    /// @notice Escrow (date) service fee in basis points (2000 = 20%). Capped at 100%.
    uint16 public feeBps;
    /// @notice Peer-to-peer transfer commission in basis points (200 = 2%).
    uint16 public transferFeeBps;
    /// @notice How long after acceptance the proposer has to confirm/cancel before
    /// the payee may claim the payout themselves.
    uint64 public claimTimeout = 7 days;

    uint256 public nextId = 1;
    mapping(uint256 => Escrow) public escrows;

    event Proposed(uint256 indexed id, address indexed proposer, address indexed payee, uint256 amount);
    event Accepted(uint256 indexed id, uint256 amount);
    event Declined(uint256 indexed id);
    event Confirmed(uint256 indexed id, uint256 payout, uint256 fee);
    event Cancelled(uint256 indexed id, uint256 refund, uint256 fee);
    event PayeeCancelled(uint256 indexed id, uint256 refund);
    event Claimed(uint256 indexed id, uint256 payout, uint256 fee);
    event ClaimTimeoutChanged(uint64 claimTimeout);
    event ServiceWalletChanged(address indexed wallet);
    event FeeChanged(uint16 feeBps);
    event TransferFeeChanged(uint16 transferFeeBps);
    event Transferred(address indexed from, address indexed to, uint256 net, uint256 fee);

    constructor(
        address initialOwner,
        IERC20 token_,
        address serviceWallet_,
        uint16 feeBps_,
        uint16 transferFeeBps_
    ) Ownable(initialOwner) {
        require(address(token_) != address(0), "token=0");
        require(serviceWallet_ != address(0), "service=0");
        require(feeBps_ <= 10000, "fee>100%");
        require(transferFeeBps_ <= 10000, "transferFee>100%");
        token = token_;
        serviceWallet = serviceWallet_;
        feeBps = feeBps_;
        transferFeeBps = transferFeeBps_;
    }

    function setServiceWallet(address wallet) external onlyOwner {
        require(wallet != address(0), "service=0");
        serviceWallet = wallet;
        emit ServiceWalletChanged(wallet);
    }

    function setFeeBps(uint16 bps) external onlyOwner {
        require(bps <= 10000, "fee>100%");
        feeBps = bps;
        emit FeeChanged(bps);
    }

    function setTransferFeeBps(uint16 bps) external onlyOwner {
        require(bps <= 10000, "transferFee>100%");
        transferFeeBps = bps;
        emit TransferFeeChanged(bps);
    }

    function setClaimTimeout(uint64 timeout) external onlyOwner {
        require(timeout >= 1 hours, "timeout<1h");
        claimTimeout = timeout;
        emit ClaimTimeoutChanged(timeout);
    }

    /// @notice Direct peer-to-peer payment: recipient gets amount-fee, service gets fee.
    /// The sender must approve this contract for `amount` first.
    function payTransfer(address to, uint256 amount) external nonReentrant {
        require(to != address(0), "to=0");
        require(to != msg.sender, "self");
        require(amount > 0, "amount=0");
        uint256 fee = (amount * transferFeeBps) / 10000;
        uint256 net = amount - fee;
        token.safeTransferFrom(msg.sender, to, net);
        if (fee > 0) token.safeTransferFrom(msg.sender, serviceWallet, fee);
        emit Transferred(msg.sender, to, net, fee);
    }

    /// @notice Proposer offers `amount` to `payee`. No funds move until acceptance.
    function propose(address payee, uint256 amount) external returns (uint256 id) {
        require(payee != address(0), "payee=0");
        require(payee != msg.sender, "self");
        require(amount > 0, "amount=0");
        id = nextId++;
        escrows[id] = Escrow({
            proposer: msg.sender,
            payee: payee,
            amount: amount,
            status: Status.Proposed,
            acceptedAt: 0
        });
        emit Proposed(id, msg.sender, payee, amount);
    }

    /// @notice Payee accepts; the amount is pulled from the proposer and locked.
    function accept(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        require(e.status == Status.Proposed, "bad status");
        require(msg.sender == e.payee, "not payee");
        e.status = Status.Accepted;
        e.acceptedAt = uint64(block.timestamp);
        token.safeTransferFrom(e.proposer, address(this), e.amount);
        emit Accepted(id, e.amount);
    }

    /// @notice Payee declines a proposal before acceptance.
    function decline(uint256 id) external {
        Escrow storage e = escrows[id];
        require(e.status == Status.Proposed, "bad status");
        require(msg.sender == e.payee, "not payee");
        e.status = Status.Declined;
        emit Declined(id);
    }

    /// @notice Proposer confirms the date happened: payee gets amount-fee, service gets fee.
    function confirm(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        require(e.status == Status.Accepted, "bad status");
        require(msg.sender == e.proposer, "not proposer");
        e.status = Status.Confirmed;
        uint256 fee = (e.amount * feeBps) / 10000;
        uint256 payout = e.amount - fee;
        if (payout > 0) token.safeTransfer(e.payee, payout);
        if (fee > 0) token.safeTransfer(serviceWallet, fee);
        emit Confirmed(id, payout, fee);
    }

    /// @notice Proposer cancels. Before acceptance: no funds moved. After acceptance:
    /// the service keeps the fee and the proposer is refunded the remainder.
    function cancel(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        require(e.status == Status.Proposed || e.status == Status.Accepted, "bad status");
        require(msg.sender == e.proposer, "not proposer");
        bool wasFunded = e.status == Status.Accepted;
        e.status = Status.Cancelled;
        uint256 fee = 0;
        uint256 refund = 0;
        if (wasFunded) {
            fee = (e.amount * feeBps) / 10000;
            refund = e.amount - fee;
            if (fee > 0) token.safeTransfer(serviceWallet, fee);
            if (refund > 0) token.safeTransfer(e.proposer, refund);
        }
        emit Cancelled(id, refund, fee);
    }

    /// @notice Payee backs out after accepting: the proposer is refunded in full,
    /// no fee is taken (the payee is the one breaking the deal).
    function cancelByPayee(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        require(e.status == Status.Accepted, "bad status");
        require(msg.sender == e.payee, "not payee");
        e.status = Status.Declined;
        token.safeTransfer(e.proposer, e.amount);
        emit PayeeCancelled(id, e.amount);
    }

    /// @notice If the proposer neither confirms nor cancels within `claimTimeout`
    /// of acceptance, the payee may claim the payout (same split as confirm), so
    /// funds can never be locked forever by an unresponsive proposer.
    function claim(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        require(e.status == Status.Accepted, "bad status");
        require(msg.sender == e.payee, "not payee");
        require(block.timestamp >= uint256(e.acceptedAt) + claimTimeout, "too early");
        e.status = Status.Confirmed;
        uint256 fee = (e.amount * feeBps) / 10000;
        uint256 payout = e.amount - fee;
        if (payout > 0) token.safeTransfer(e.payee, payout);
        if (fee > 0) token.safeTransfer(serviceWallet, fee);
        emit Claimed(id, payout, fee);
    }
}
