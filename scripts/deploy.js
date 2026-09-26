const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("====================================================");
  console.log("Deploying AnchorRegistry to Ethereum Sepolia Testnet");
  console.log("====================================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with wallet address:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Wallet balance:", hre.ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("Deployer wallet balance is 0 ETH. Please fund with SepoliaETH.");
  }

  const AnchorRegistry = await hre.ethers.getContractFactory("AnchorRegistry");
  console.log("Broadcasting deployment transaction to Sepolia...");
  
  const anchorRegistry = await AnchorRegistry.deploy();
  await anchorRegistry.waitForDeployment();

  const contractAddress = await anchorRegistry.getAddress();
  const deploymentTx = anchorRegistry.deploymentTransaction();
  const txHash = deploymentTx ? deploymentTx.hash : "N/A";

  console.log("----------------------------------------------------");
  console.log("✅ AnchorRegistry Contract Deployed Successfully!");
  console.log("Contract Address:", contractAddress);
  console.log("Deployment Tx Hash:", txHash);
  console.log("Etherscan Link: https://sepolia.etherscan.io/address/" + contractAddress);
  console.log("----------------------------------------------------");

  // Save contract artifact (ABI & address) for application integration
  const artifactPath = path.join(__dirname, "..", "lib", "blockchain");
  if (!fs.existsSync(artifactPath)) {
    fs.mkdirSync(artifactPath, { recursive: true });
  }

  const contractArtifact = {
    address: contractAddress,
    network: "sepolia",
    chainId: 11155111,
    deployedAt: new Date().toISOString(),
    txHash: txHash,
    abi: [
      "function anchorCredential(bytes32 credentialHash) external",
      "function isAnchored(bytes32 credentialHash) external view returns (bool)",
      "function getAnchor(bytes32 credentialHash) external view returns (bool exists, uint256 timestamp, address anchoredBy)",
      "function totalAnchored() external view returns (uint256)",
      "event CredentialAnchored(bytes32 indexed credentialHash, address indexed anchoredBy, uint256 timestamp)"
    ],
  };

  fs.writeFileSync(
    path.join(artifactPath, "anchor-contract.json"),
    JSON.stringify(contractArtifact, null, 2)
  );
  console.log("Saved contract metadata to lib/blockchain/anchor-contract.json");

  // Update .env.local with NEXT_PUBLIC_CONTRACT_ADDRESS
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
    console.log("Updated NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local");
  }

  console.log("====================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
