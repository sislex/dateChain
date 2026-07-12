// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DateToken
 * @notice Test ERC-20 ("DATE") used to pay for dates. 18 decimals.
 * The service (owner) mints supply and funds user wallets in the local demo.
 */
contract DateToken is ERC20, Ownable {
    constructor(address initialOwner) ERC20("DateToken", "DATE") Ownable(initialOwner) {}

    /// @notice Mint new tokens. Owner-only (service treasury).
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
