import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "solidity-docgen";
import dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    arbitrum_sepolia: {
      url: `${process.env.ARB_SEPOLIA_RPC_URL}`,
      accounts: [`${process.env.DEPLOYER_PRIVATE_KEY}`],
    },
    ethereum_sepolia: {
      url: `${process.env.ETH_SEPOLIA_RPC_URL}`,
      accounts: [`${process.env.DEPLOYER_PRIVATE_KEY}`],
    },
    base_sepolia: {
      url: `${process.env.BASE_SEPOLIA_RPC_URL}`,
      accounts: [`${process.env.DEPLOYER_PRIVATE_KEY}`],
    },
  },
  // etherscan: {
  //   apiKey: process.env.ETHERSCAN_API_KEY,
  // },
  etherscan: {
    apiKey: {
      baseSepolia: "abc",
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://base-sepolia.blockscout.com/api",
          browserURL: "https://base-sepolia.blockscout.com/",
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
  defaultNetwork: "hardhat",
  gasReporter: {
    enabled: true,
  },
};

export default config;
