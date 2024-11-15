import { ethers } from "hardhat";

/**
 * Computes the ENS name commitment hash locally.
 * @param name - The ENS name to register (e.g., "example").
 * @param owner - The Ethereum address that will own the name.
 * @param duration - The registration duration in seconds.
 * @param secret - A secret value for the commitment.
 * @param resolver - The resolver address to set (optional).
 * @param data - Additional resolver setup data (optional).
 * @param reverseRecord - Whether to set the reverse record.
 * @param fuses - Optional parameter to set the name's fuses.
 * @returns The computed commitment hash as a bytes32 string.
 */
function makeCommitment(
  name: string,
  owner: string,
  duration: number,
  secret: string,
  resolver: string,
  data: string[],
  reverseRecord: boolean,
  fuses: number,
): string {
  // Ensure the parameters are correctly formatted
  if (!ethers.utils.isAddress(owner)) {
    throw new Error("Invalid owner address");
  }

  if (resolver && !ethers.utils.isAddress(resolver)) {
    throw new Error("Invalid resolver address");
  }

  const label = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name));

  // Pack the parameters as expected in the ENS makeCommitment function
  const encoded = ethers.utils.defaultAbiCoder.encode(
    [
      "bytes32", // name
      "address", // owner
      "uint256", // duration
      "bytes32", // secret
      "address", // resolver
      "bytes[]", // data
      "bool", // reverseRecord
      "uint16", // fuses
    ],
    [label, owner, duration, secret, resolver, data, reverseRecord, fuses],
  );

  // Hash the encoded parameters to produce the commitment
  const commitmentHash = ethers.utils.keccak256(encoded);

  return commitmentHash;
}

async function main() {
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY || ""; // Replace with your private key

  const baseSepoliaRPC = process.env.BASE_SEPOLIA_RPC_URL; // Replace with your RPC URL
  const providerARB = new ethers.providers.JsonRpcProvider(baseSepoliaRPC);
  const deployerL2 = new ethers.Wallet(deployerKey, providerARB);

  const L2BaseSepolia = "0xB0F30A5F70708c83c9d92A434DABe8372bE9Aa8c";

  const L2 = await ethers.getContractAt("CCIPL2", L2BaseSepolia, deployerL2);

  const commitment = makeCommitment(
    "nameisnottakenforsure", // name
    deployerL2.address, // owner
    31556952, // duration (e.g., 1 year in seconds)
    "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", // secret
    "0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63", // resolver
    [], // data
    false, // reverseRecord
    0, // fuses
  );
  console.log("Computed commitment:", commitment);

  // Approve Link to be spent
  const L2LinkAddress = "0xE4aB69C077896252FAFBD49EFD26B5D171A32410";
  const LinkToken = await ethers.getContractAt(
    ApproveInterface,
    L2LinkAddress,
    deployerL2,
  );
  const tx1 = await LinkToken.approve(L2.address, ethers.constants.MaxUint256);
  await tx1.wait();
  console.log("Approved %s at tx %s:", L2LinkAddress, tx1.hash);

  const tx0 = await L2.commit(commitment);
  await tx0.wait();
  console.log("Committed %s at tx %s:", commitment, tx0.hash);
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
