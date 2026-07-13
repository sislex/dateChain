import { expect } from "chai";
import { ethers } from "hardhat";

const FEE_BPS = 2000n; // 20%
const TRANSFER_FEE_BPS = 200n; // 2%
const AMOUNT = 1000n;

describe("DateEscrow", () => {
  async function deploy() {
    const [owner, proposer, payee, service, outsider] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("DateToken");
    const token = await Token.deploy(owner.address);
    const Escrow = await ethers.getContractFactory("DateEscrow");
    const escrow = await Escrow.deploy(
      owner.address,
      await token.getAddress(),
      service.address,
      FEE_BPS,
      TRANSFER_FEE_BPS,
    );

    // Fund the proposer and pre-approve the escrow (custodial flow does this).
    await token.mint(proposer.address, 10_000n);
    await token.connect(proposer).approve(await escrow.getAddress(), 10_000n);
    return { token, escrow, owner, proposer, payee, service, outsider };
  }

  async function propose(escrow: any, proposer: any, payee: any, amount = AMOUNT) {
    await escrow.connect(proposer).propose(payee.address, amount);
    return Number(await escrow.nextId()) - 1;
  }

  it("propose records an escrow without moving funds", async () => {
    const { escrow, token, proposer, payee } = await deploy();
    const before = await token.balanceOf(proposer.address);
    const id = await propose(escrow, proposer, payee);
    const e = await escrow.escrows(id);
    expect(e.proposer).to.equal(proposer.address);
    expect(e.payee).to.equal(payee.address);
    expect(e.amount).to.equal(AMOUNT);
    expect(e.status).to.equal(1); // Proposed
    expect(await token.balanceOf(proposer.address)).to.equal(before);
  });

  it("accept locks the amount from the proposer", async () => {
    const { escrow, token, proposer, payee } = await deploy();
    const id = await propose(escrow, proposer, payee);
    const before = await token.balanceOf(proposer.address);
    await escrow.connect(payee).accept(id);
    expect(await token.balanceOf(proposer.address)).to.equal(before - AMOUNT);
    expect(await token.balanceOf(await escrow.getAddress())).to.equal(AMOUNT);
    expect((await escrow.escrows(id)).status).to.equal(2); // Accepted
  });

  it("confirm splits 80% to payee and 20% to service", async () => {
    const { escrow, token, proposer, payee, service } = await deploy();
    const id = await propose(escrow, proposer, payee);
    await escrow.connect(payee).accept(id);
    await escrow.connect(proposer).confirm(id);
    expect(await token.balanceOf(payee.address)).to.equal((AMOUNT * 80n) / 100n);
    expect(await token.balanceOf(service.address)).to.equal((AMOUNT * 20n) / 100n);
    expect(await token.balanceOf(await escrow.getAddress())).to.equal(0n);
    expect((await escrow.escrows(id)).status).to.equal(3); // Confirmed
  });

  it("cancel after accept charges 20% penalty and refunds 80%", async () => {
    const { escrow, token, proposer, payee, service } = await deploy();
    const id = await propose(escrow, proposer, payee);
    const before = await token.balanceOf(proposer.address);
    await escrow.connect(payee).accept(id);
    await escrow.connect(proposer).cancel(id);
    // proposer lost only the 20% fee overall
    expect(await token.balanceOf(proposer.address)).to.equal(before - (AMOUNT * 20n) / 100n);
    expect(await token.balanceOf(service.address)).to.equal((AMOUNT * 20n) / 100n);
    expect(await token.balanceOf(payee.address)).to.equal(0n);
    expect((await escrow.escrows(id)).status).to.equal(4); // Cancelled
  });

  it("cancel before accept moves no funds", async () => {
    const { escrow, token, proposer, payee, service } = await deploy();
    const id = await propose(escrow, proposer, payee);
    const before = await token.balanceOf(proposer.address);
    await escrow.connect(proposer).cancel(id);
    expect(await token.balanceOf(proposer.address)).to.equal(before);
    expect(await token.balanceOf(service.address)).to.equal(0n);
    expect((await escrow.escrows(id)).status).to.equal(4); // Cancelled
  });

  it("decline before accept moves no funds", async () => {
    const { escrow, token, proposer, payee } = await deploy();
    const id = await propose(escrow, proposer, payee);
    const before = await token.balanceOf(proposer.address);
    await escrow.connect(payee).decline(id);
    expect(await token.balanceOf(proposer.address)).to.equal(before);
    expect((await escrow.escrows(id)).status).to.equal(5); // Declined
  });

  describe("access control & invalid transitions", () => {
    it("only the payee can accept/decline", async () => {
      const { escrow, proposer, payee, outsider } = await deploy();
      const id = await propose(escrow, proposer, payee);
      await expect(escrow.connect(outsider).accept(id)).to.be.revertedWith("not payee");
      await expect(escrow.connect(proposer).decline(id)).to.be.revertedWith("not payee");
    });

    it("only the proposer can confirm/cancel", async () => {
      const { escrow, proposer, payee, outsider } = await deploy();
      const id = await propose(escrow, proposer, payee);
      await escrow.connect(payee).accept(id);
      await expect(escrow.connect(outsider).confirm(id)).to.be.revertedWith("not proposer");
      await expect(escrow.connect(payee).cancel(id)).to.be.revertedWith("not proposer");
    });

    it("cannot confirm before acceptance", async () => {
      const { escrow, proposer, payee } = await deploy();
      const id = await propose(escrow, proposer, payee);
      await expect(escrow.connect(proposer).confirm(id)).to.be.revertedWith("bad status");
    });

    it("cannot accept twice", async () => {
      const { escrow, proposer, payee } = await deploy();
      const id = await propose(escrow, proposer, payee);
      await escrow.connect(payee).accept(id);
      await expect(escrow.connect(payee).accept(id)).to.be.revertedWith("bad status");
    });

    it("reverts accept without allowance/balance", async () => {
      const { escrow, token, proposer, payee } = await deploy();
      const id = await propose(escrow, proposer, payee);
      await token.connect(proposer).approve(await escrow.getAddress(), 0n);
      await expect(escrow.connect(payee).accept(id)).to.be.reverted;
    });

    it("rejects self-proposal and zero amount", async () => {
      const { escrow, proposer, payee } = await deploy();
      await expect(escrow.connect(proposer).propose(proposer.address, AMOUNT)).to.be.revertedWith("self");
      await expect(escrow.connect(proposer).propose(payee.address, 0n)).to.be.revertedWith("amount=0");
    });
  });

  describe("payTransfer (p2p with commission)", () => {
    it("sends net to the recipient and the fee to the service", async () => {
      const { escrow, token, proposer, payee, service } = await deploy();
      const amount = 1000n;
      const before = await token.balanceOf(proposer.address);
      await escrow.connect(proposer).payTransfer(payee.address, amount);
      const fee = (amount * TRANSFER_FEE_BPS) / 10000n; // 20
      expect(await token.balanceOf(payee.address)).to.equal(amount - fee); // 980
      expect(await token.balanceOf(service.address)).to.equal(fee); // 20
      expect(await token.balanceOf(proposer.address)).to.equal(before - amount);
    });

    it("reverts on self-transfer, zero amount and missing allowance", async () => {
      const { escrow, token, proposer, payee } = await deploy();
      await expect(escrow.connect(proposer).payTransfer(proposer.address, 100n)).to.be.revertedWith("self");
      await expect(escrow.connect(proposer).payTransfer(payee.address, 0n)).to.be.revertedWith("amount=0");
      await token.connect(proposer).approve(await escrow.getAddress(), 0n);
      await expect(escrow.connect(proposer).payTransfer(payee.address, 100n)).to.be.reverted;
    });

    it("respects a changed transfer fee", async () => {
      const { escrow, token, owner, proposer, payee, service } = await deploy();
      await escrow.connect(owner).setTransferFeeBps(1000); // 10%
      await escrow.connect(proposer).payTransfer(payee.address, 1000n);
      expect(await token.balanceOf(service.address)).to.equal(100n);
      expect(await token.balanceOf(payee.address)).to.equal(900n);
    });

    it("only the owner can change the transfer fee", async () => {
      const { escrow, outsider } = await deploy();
      await expect(escrow.connect(outsider).setTransferFeeBps(500)).to.be.reverted;
    });
  });

  describe("admin", () => {
    it("owner can change service wallet and fee", async () => {
      const { escrow, owner, outsider } = await deploy();
      await escrow.connect(owner).setServiceWallet(outsider.address);
      expect(await escrow.serviceWallet()).to.equal(outsider.address);
      await escrow.connect(owner).setFeeBps(1000);
      expect(await escrow.feeBps()).to.equal(1000);
    });

    it("non-owner cannot change settings", async () => {
      const { escrow, outsider } = await deploy();
      await expect(escrow.connect(outsider).setServiceWallet(outsider.address)).to.be.reverted;
      await expect(escrow.connect(outsider).setFeeBps(1000)).to.be.reverted;
    });
  });
});
