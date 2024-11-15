import { ethers } from "hardhat";

async function main() {
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY || ""; // Replace with your private key

  const ethereumSepoliaRPC = process.env.ETH_SEPOLIA_RPC_URL; // Replace with your RPC URL
  const providerETH = new ethers.providers.JsonRpcProvider(ethereumSepoliaRPC);
  const deployerL1 = new ethers.Wallet(deployerKey, providerETH);

  const baseSepoliaRPC = process.env.BASE_SEPOLIA_RPC_URL; // Replace with your RPC URL
  const providerARB = new ethers.providers.JsonRpcProvider(baseSepoliaRPC);
  const deployerL2 = new ethers.Wallet(deployerKey, providerARB);

  const L1EthSepolia = "0xF04A02c5Ec0dB6E363771C9171Ca00A4f33Eb298";
  const L1 = await ethers.getContractAt("CCIPL1", L1EthSepolia, deployerL1);
  const tx0 = await L1.withdraw(deployerL1.address);
  await tx0.wait();
  console.log("Withdrawn from L1 was a success", tx0.hash);

  const L2BaseSepolia = "0xB0F30A5F70708c83c9d92A434DABe8372bE9Aa8c";
  const L2 = await ethers.getContractAt("CCIPL2", L2BaseSepolia, deployerL2);
  const tx1 = await L2.withdraw(deployerL2.address);
  await tx1.wait();
  console.log("Withdrawn from L2 was a success", tx1.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
