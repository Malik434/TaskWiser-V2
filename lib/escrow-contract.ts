/**
 * Escrow Contract Integration Utilities
 * Handles all interactions with the TaskWiserEscrow smart contract
 */

import { ethers } from "ethers";

// Contract ABI (minimal for frontend)
export const ESCROW_ABI = [
  "function lockEscrow(bytes32 taskId, address token, address assignee, uint256 amount) external",
  "function releaseEscrow(bytes32 taskId) external",
  "function refundEscrowByAssignee(bytes32 taskId, string calldata reason) external",
  "function retrieveEscrow(bytes32 taskId, string calldata reason) external",
  "function releaseEscrowByAdmin(bytes32 taskId) external",
  "function getEscrow(bytes32 taskId) external view returns (tuple(bytes32 taskId, address token, address admin, address assignee, uint256 amount, uint8 status, uint256 lockedAt, uint256 releasedAt))",
  "function isEscrowLocked(bytes32 taskId) external view returns (bool)",
  "function getEscrowStatus(bytes32 taskId) external view returns (uint8)",
  "event EscrowLocked(bytes32 indexed taskId, address indexed token, address indexed admin, address assignee, uint256 amount)",
  "event EscrowReleased(bytes32 indexed taskId, address indexed assignee, uint256 amount)",
  "event EscrowRefunded(bytes32 indexed taskId, address indexed admin, uint256 amount, string reason)",
  "event EscrowRefundedByAssignee(bytes32 indexed taskId, address indexed assignee, address indexed admin, uint256 amount, string reason)",
] as const;

// Escrow status enum (matches contract)
export enum EscrowStatus {
  None = 0,
  Locked = 1,
  Released = 2,
  Refunded = 3,
}

// Token addresses on Sepolia
export const TOKEN_ADDRESSES = {
  USDC: "0x427B7203ECCD442eB0a293C3a96c5A85C6476203",
  USDT: "0xA0DF73C3AEBc134c1737E407f8C9a21FeEd87Dfd",
} as const;

// ERC20 ABI for approvals
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
] as const;

/**
 * Get the escrow contract instance
 */
export function getEscrowContract(
  provider: ethers.Provider | ethers.Signer
): ethers.Contract {
  const contractAddress =
    process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS ||
    "0x0000000000000000000000000000000000000000"; // Update after deployment

  if (contractAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("Escrow contract address not configured");
  }

  return new ethers.Contract(contractAddress, ESCROW_ABI, provider);
}

/**
 * Convert task ID string to bytes32
 */
export function taskIdToBytes32(taskId: string): string {
  // Use keccak256 hash of taskId to create bytes32
  return ethers.keccak256(ethers.toUtf8Bytes(taskId));
}

/**
 * Check if user has approved enough tokens for escrow
 */
export async function checkTokenApproval(
  provider: ethers.Provider | ethers.Signer,
  tokenAddress: string,
  owner: string,
  amount: bigint
): Promise<boolean> {
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const escrowAddress =
    process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS ||
    "0x0000000000000000000000000000000000000000";

  const allowance = await contract.allowance(owner, escrowAddress);
  return allowance >= amount;
}

/**
 * Approve tokens for escrow contract
 */
export async function approveToken(
  signer: ethers.Signer,
  tokenAddress: string,
  amount: bigint
): Promise<ethers.ContractTransactionResponse> {
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const escrowAddress =
    process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS ||
    "0x0000000000000000000000000000000000000000";

  return contract.approve(escrowAddress, amount);
}

/**
 * Lock tokens in escrow
 */
export async function lockEscrow(
  signer: ethers.Signer,
  taskId: string,
  token: "USDC" | "USDT",
  assigneeAddress: string,
  amount: number
): Promise<ethers.ContractTransactionResponse> {
  const contract = getEscrowContract(signer);
  const tokenAddress = TOKEN_ADDRESSES[token];
  const taskIdBytes32 = taskIdToBytes32(taskId);

  // Convert amount to token decimals (6 for USDC/USDT)
  const amountWei = ethers.parseUnits(amount.toString(), 6);

  // Check and approve if needed
  const hasApproval = await checkTokenApproval(
    signer,
    tokenAddress,
    await signer.getAddress(),
    amountWei
  );

  if (!hasApproval) {
    await approveToken(signer, tokenAddress, amountWei);
    // Wait for approval transaction
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return contract.lockEscrow(taskIdBytes32, tokenAddress, assigneeAddress, amountWei);
}

/**
 * Release escrow to assignee
 */
export async function releaseEscrow(
  signer: ethers.Signer,
  taskId: string
): Promise<ethers.ContractTransactionResponse> {
  const contract = getEscrowContract(signer);
  const taskIdBytes32 = taskIdToBytes32(taskId);

  return contract.releaseEscrow(taskIdBytes32);
}

/**
 * Refund escrow by assignee (assignee refunds back to task creator)
 */
export async function refundEscrowByAssignee(
  signer: ethers.Signer,
  taskId: string,
  reason: string
): Promise<ethers.ContractTransactionResponse> {
  const contract = getEscrowContract(signer);
  const taskIdBytes32 = taskIdToBytes32(taskId);

  return contract.refundEscrowByAssignee(taskIdBytes32, reason);
}

/**
 * Retrieve escrow (admin/dispute resolution - only contract owner)
 * Used when admin needs to refund to creator during dispute
 */
export async function retrieveEscrow(
  signer: ethers.Signer,
  taskId: string,
  reason: string
): Promise<ethers.ContractTransactionResponse> {
  const contract = getEscrowContract(signer);
  const taskIdBytes32 = taskIdToBytes32(taskId);

  return contract.retrieveEscrow(taskIdBytes32, reason);
}

/**
 * Release escrow by admin (for dispute resolution - approve assignee)
 * Only contract owner can call - used when admin approves assignee's work
 */
export async function releaseEscrowByAdmin(
  signer: ethers.Signer,
  taskId: string
): Promise<ethers.ContractTransactionResponse> {
  const contract = getEscrowContract(signer);
  const taskIdBytes32 = taskIdToBytes32(taskId);

  return contract.releaseEscrowByAdmin(taskIdBytes32);
}

/**
 * Get escrow status
 */
export async function getEscrowStatus(
  provider: ethers.Provider,
  taskId: string
): Promise<EscrowStatus> {
  const contract = getEscrowContract(provider);
  const taskIdBytes32 = taskIdToBytes32(taskId);

  const status = await contract.getEscrowStatus(taskIdBytes32);
  return Number(status) as EscrowStatus;
}

/**
 * Check if escrow is locked
 */
export async function isEscrowLocked(
  provider: ethers.Provider,
  taskId: string
): Promise<boolean> {
  const contract = getEscrowContract(provider);
  const taskIdBytes32 = taskIdToBytes32(taskId);

  return contract.isEscrowLocked(taskIdBytes32);
}

/**
 * Get escrow details
 */
export async function getEscrowDetails(
  provider: ethers.Provider,
  taskId: string
): Promise<{
  taskId: string;
  token: string;
  admin: string;
  assignee: string;
  amount: bigint;
  status: EscrowStatus;
  lockedAt: bigint;
  releasedAt: bigint;
}> {
  const contract = getEscrowContract(provider);
  const taskIdBytes32 = taskIdToBytes32(taskId);

  const escrow = await contract.getEscrow(taskIdBytes32);

  return {
    taskId: escrow.taskId,
    token: escrow.token,
    admin: escrow.admin,
    assignee: escrow.assignee,
    amount: escrow.amount,
    status: Number(escrow.status) as EscrowStatus,
    lockedAt: escrow.lockedAt,
    releasedAt: escrow.releasedAt,
  };
}

/**
 * Wait for transaction and verify it was successful
 * Also syncs the on-chain escrow status with the provided callback
 */
export async function waitForTransactionAndVerify(
  txResponse: ethers.ContractTransactionResponse,
  onSuccess?: () => Promise<void>
): Promise<ethers.TransactionReceipt | null> {
  const receipt = await txResponse.wait();
  
  if (receipt && receipt.status === 1) {
    // Transaction successful
    if (onSuccess) {
      await onSuccess();
    }
    return receipt;
  } else {
    throw new Error("Transaction failed");
  }
}

/**
 * Get formatted amount from bigint (for display)
 */
export function formatEscrowAmount(amount: bigint, decimals: number = 6): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  
  if (fraction === BigInt(0)) {
    return whole.toString();
  }
  
  const fractionStr = fraction.toString().padStart(decimals, '0');
  // Remove trailing zeros
  const trimmedFraction = fractionStr.replace(/0+$/, '');
  
  return `${whole}.${trimmedFraction}`;
}

