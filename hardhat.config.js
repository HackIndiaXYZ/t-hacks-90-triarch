require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env.local" });

const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "https://rpc.sepolia.org";
let privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY || "";
if (privateKey && !privateKey.startsWith("0x")) {
  privateKey = "0x" + privateKey;
}

const accounts = privateKey && privateKey.length === 66 ? [privateKey] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    sepolia: {
      url: rpcUrl,
      chainId: 11155111,
      accounts: accounts,
    },
  },
};
