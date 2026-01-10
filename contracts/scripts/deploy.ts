import { ethers } from "hardhat";

async function main() {
  console.log("Deploying TaskWiserEscrow contract...");

  const TaskWiserEscrow = await ethers.getContractFactory("TaskWiserEscrow");
  const escrow = await TaskWiserEscrow.deploy();

  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log("TaskWiserEscrow deployed to:", address);
  console.log("Deployer address:", await escrow.owner());
  
  // Verify deployment
  console.log("\nVerifying deployment...");
  console.log("Contract address:", address);
  console.log("Network:", await ethers.provider.getNetwork());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

