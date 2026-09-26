const fs = require("fs");
const path = require("path");
const solc = require("solc");
const { ethers } = require("ethers");
require("dotenv").config({ path: ".env.local" });

async function compileContract() {
  console.log("Compiling AnchorRegistry.sol with Solc...");
  const contractPath = path.join(__dirname, "..", "contracts", "AnchorRegistry.sol");
  const source = fs.readFileSync(contractPath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "AnchorRegistry.sol": {
        content: source,
      },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const errors = output.errors.filter((e) => e.severity === "error");
    if (errors.length > 0) {
      console.error("Compilation errors:", errors);
      throw new Error("Solidity compilation failed.");
    }
  }

  const contract = output.contracts["AnchorRegistry.sol"]["AnchorRegistry"];
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  console.log("✅ Compilation successful!");
  return { abi, bytecode };
}

async function main() {
  console.log("====================================================");
  console.log("Deploying AnchorRegistry to Ethereum Sepolia Testnet");
  console.log("====================================================");

  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
  let privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY || "";
  if (!privateKey.startsWith("0x")) {
    privateKey = "0x" + privateKey;
  }

  if (!rpcUrl) {
    throw new Error("BLOCKCHAIN_RPC_URL is missing in .env.local");
  }
  if (!privateKey || privateKey.length !== 66) {
    throw new Error("BLOCKCHAIN_PRIVATE_KEY is missing or invalid in .env.local");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  console.log("Network:", network.name, "| ChainId:", network.chainId.toString());

  if (network.chainId !== 11155111n) {
    console.warn("⚠️ Warning: Expected Sepolia (11155111), but connected to chainId:", network.chainId.toString());
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  console.log("Deployer Address:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("Wallet Balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("Deployer wallet balance is 0 ETH. Please fund with SepoliaETH.");
  }

  // 1. Compile contract
  const { abi, bytecode } = await compileContract();

  // 2. Deploy contract to Sepolia
  console.log("Broadcasting deployment transaction to Ethereum Sepolia...");
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();

  console.log("Waiting for block confirmation on Sepolia...");
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();
  const txHash = deployTx ? deployTx.hash : "N/A";
  const receipt = deployTx ? await deployTx.wait(1) : null;
  const blockNumber = receipt ? receipt.blockNumber : (await provider.getBlockNumber());

  console.log("----------------------------------------------------");
  console.log("🎉 AnchorRegistry Successfully Deployed to Sepolia!");
  console.log("Contract Address:", contractAddress);
  console.log("Deployment Tx Hash:", txHash);
  console.log("Block Number:", blockNumber);
  console.log("Etherscan Explorer: https://sepolia.etherscan.io/address/" + contractAddress);
  console.log("Transaction Link:   https://sepolia.etherscan.io/tx/" + txHash);
  console.log("----------------------------------------------------");

  // 3. Save artifact for application
  const artifactDir = path.join(__dirname, "..", "lib", "blockchain");
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const contractArtifact = {
    address: contractAddress,
    network: "sepolia",
    chainId: 11155111,
    deployedAt: new Date().toISOString(),
    deployer: wallet.address,
    txHash: txHash,
    blockNumber: blockNumber,
    abi: abi,
  };

  fs.writeFileSync(
    path.join(artifactDir, "anchor-contract.json"),
    JSON.stringify(contractArtifact, null, 2)
  );
  console.log("✅ Saved contract artifact to lib/blockchain/anchor-contract.json");

  // 4. Update .env.local
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    if (envContent.includes("NEXT_PUBLIC_CONTRACT_ADDRESS=")) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_CONTRACT_ADDRESS=.*/,
        `NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`
      );
    } else {
      envContent += `\nNEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}\n`;
    }
    fs.writeFileSync(envPath, envContent, "utf8");
    console.log("✅ Updated NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local");
  }

  console.log("====================================================");
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});
