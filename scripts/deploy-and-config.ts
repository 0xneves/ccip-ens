import { ethers } from "hardhat";

async function main() {
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY || ""; // Replace with your private key

  const ethereumSepoliaRPC = process.env.ETH_SEPOLIA_RPC_URL; // Replace with your RPC URL
  const providerETH = new ethers.providers.JsonRpcProvider(ethereumSepoliaRPC);
  const deployerL1 = new ethers.Wallet(deployerKey, providerETH);

  const baseSepoliaRPC = process.env.BASE_SEPOLIA_RPC_URL; // Replace with your RPC URL
  const providerARB = new ethers.providers.JsonRpcProvider(baseSepoliaRPC);
  const deployerL2 = new ethers.Wallet(deployerKey, providerARB);

  console.log("Deploying contracts with the account:", deployerL1.address);

  const L1Router = "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59";
  const ETHRegistrarController = "0xfed6a969aaa60e4961fcd3ebf1a2e8913ac65b72";

  const L1Factory = await ethers.getContractFactory("CCIPL1", deployerL1);
  const L1 = await L1Factory.deploy(L1Router, ETHRegistrarController);
  console.log("L1 address:", L1.address);

  const L2Router = "0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93";
  const L2LinkAddress = "0xE4aB69C077896252FAFBD49EFD26B5D171A32410";
  const SepoliaChainSelector = "16015286601757825753";
  const SepoliaContract = L1.address;

  const L2Factory = await ethers.getContractFactory("CCIPL2", deployerL2);
  const L2 = await L2Factory.deploy(
    L2Router,
    L2LinkAddress,
    SepoliaChainSelector,
    SepoliaContract,
  );
  console.log("L2 address:", L2.address);

  const baseSepoliaChainSelector = "10344971235874465080";
  const AllowlistedSender = L2.address;

  const tx0 = await L1.allowlistSourceChain(baseSepoliaChainSelector, true);
  console.log(
    "Allowed %s selector at tx %s:",
    baseSepoliaChainSelector,
    tx0.hash,
  );

  const tx1 = await L1.allowlistSender(AllowlistedSender, true);
  console.log("Allowed %s sender at tx %s:", AllowlistedSender, tx1.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
