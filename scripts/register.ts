import { ethers } from "hardhat";

async function main() {
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY || ""; // Replace with your private key

  const baseSepoliaRPC = process.env.BASE_SEPOLIA_RPC_URL; // Replace with your RPC URL
  const providerARB = new ethers.providers.JsonRpcProvider(baseSepoliaRPC);
  const deployerL2 = new ethers.Wallet(deployerKey, providerARB);

  const L2BaseSepolia = "0xB0F30A5F70708c83c9d92A434DABe8372bE9Aa8c";

  const L2 = await ethers.getContractAt("CCIPL2", L2BaseSepolia, deployerL2);

  // Approve Link to be spent
  const L2LinkAddress = "0xE4aB69C077896252FAFBD49EFD26B5D171A32410";
  const LinkToken = await ethers.getContractAt(
    ApproveInterface,
    L2LinkAddress,
    deployerL2,
  );
  const tx0 = await LinkToken.approve(L2.address, ethers.constants.MaxUint256);
  await tx0.wait();
  console.log("Approved %s at tx %s:", L2LinkAddress, tx0.hash);

  const tx1 = await L2.register(
    "nameisnottakenforsure", // name
    deployerL2.address, // owner
    31556952, // duration (e.g., 1 year in seconds)
    "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", // secret
    "0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63", // resolver
    [], // data
    false, // reverseRecord. Must be false since primary name can only be settled to msg.sender
    0, // fuses
    { value: ethers.utils.parseEther("0.04") },
  );
  await tx1.wait();
  console.log("Registered nameisnottakenforsure at tx %s:", tx1.hash);
}

const ApproveInterface = [
  {
    constant: false,
    inputs: [
      {
        name: "spender",
        type: "address",
      },
      {
        name: "value",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
