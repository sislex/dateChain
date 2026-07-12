import { expect } from "chai";
import { ethers } from "hardhat";

describe("DateToken", () => {
  async function deploy() {
    const [owner, alice, bob] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("DateToken");
    const token = await Token.deploy(owner.address);
    return { token, owner, alice, bob };
  }

  it("has 18 decimals and DATE symbol", async () => {
    const { token } = await deploy();
    expect(await token.decimals()).to.equal(18);
    expect(await token.symbol()).to.equal("DATE");
  });

  it("lets the owner mint", async () => {
    const { token, alice } = await deploy();
    await token.mint(alice.address, 1000n);
    expect(await token.balanceOf(alice.address)).to.equal(1000n);
  });

  it("reverts when a non-owner mints", async () => {
    const { token, alice } = await deploy();
    await expect(token.connect(alice).mint(alice.address, 1000n)).to.be.reverted;
  });

  it("supports transfer and allowance", async () => {
    const { token, owner, alice, bob } = await deploy();
    await token.mint(owner.address, 1000n);
    await token.transfer(alice.address, 400n);
    expect(await token.balanceOf(alice.address)).to.equal(400n);
    await token.connect(alice).approve(bob.address, 100n);
    await token.connect(bob).transferFrom(alice.address, bob.address, 100n);
    expect(await token.balanceOf(bob.address)).to.equal(100n);
  });
});
