# TaskWiser Escrow Smart Contract

## Overview
This smart contract handles escrow functionality for TaskWiser platform, allowing secure token locking and release for task payments.

## Features
- Lock tokens in escrow when assignee is assigned
- Release tokens to assignee when task is completed (by creator or admin)
- Refund escrow by assignee back to creator
- Dispute resolution:
  - Admin can refund to creator
  - Admin can release to assignee (approve assignee's work)
- Support for ERC20 tokens (USDC, USDT)
- Real on-chain payment processing with state synchronization

## Contract Address (Sepolia)
**Deploy the contract and update this address:**
```
0x0000000000000000000000000000000000000000
```

## Deployment Instructions

### Prerequisites
1. Node.js and npm installed
2. Hardhat installed
3. Sepolia ETH for gas fees
4. Infura/Alchemy account for RPC endpoint
5. Etherscan API key for contract verification

### Setup
1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Fill in your environment variables:
- `SEPOLIA_RPC_URL`: Your Infura/Alchemy Sepolia RPC URL
- `PRIVATE_KEY`: Your deployer wallet private key
- `ETHERSCAN_API_KEY`: Your Etherscan API key

### Compile Contract
```bash
npm run compile
```

### Deploy to Sepolia
```bash
npm run deploy:sepolia
```

After deployment, you'll see:
- Contract address
- Deployer address (this is the owner who can retrieve tokens in disputes)

### Verify Contract on Etherscan
```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## Contract Functions

### lockEscrow
Locks tokens in escrow when assignee is assigned.
```solidity
function lockEscrow(
    bytes32 taskId,
    address token,
    address assignee,
    uint256 amount
) external
```

### releaseEscrow
Releases locked tokens to assignee when task is completed.
```solidity
function releaseEscrow(bytes32 taskId) external
```

### refundEscrowByAssignee
Allows assignee to refund escrow back to task creator.
```solidity
function refundEscrowByAssignee(
    bytes32 taskId,
    string calldata reason
) external
```

### retrieveEscrow
Admin can retrieve tokens back to creator in case of dispute (only deployer/owner can call).
```solidity
function retrieveEscrow(
    bytes32 taskId,
    string calldata reason
) external onlyOwner
```

### releaseEscrowByAdmin
Admin can release escrow to assignee (for dispute resolution - approve assignee).
```solidity
function releaseEscrowByAdmin(bytes32 taskId) external onlyOwner
```

### getEscrow
View function to get escrow details.
```solidity
function getEscrow(bytes32 taskId) external view returns (Escrow memory)
```

## Security Considerations

1. **Reentrancy Protection**: All state-changing functions use OpenZeppelin's ReentrancyGuard
2. **Access Control**: 
   - Only admin (task creator) can lock/release via `releaseEscrow`
   - Only assignee can refund via `refundEscrowByAssignee`
   - Only contract owner (deployer) can retrieve/approve in disputes via `retrieveEscrow` and `releaseEscrowByAdmin`
3. **Input Validation**: All inputs are validated (non-zero addresses, amounts, etc.)
4. **Safe Token Transfers**: Uses OpenZeppelin's SafeERC20 for secure transfers
5. **State Validation**: All functions verify escrow is in `Locked` state before execution

## Testing

### Manual Testing Checklist
- [ ] Deploy contract to Sepolia
- [ ] Lock escrow with USDC
- [ ] Lock escrow with USDT
- [ ] Release escrow to assignee
- [ ] Retrieve escrow (as owner)
- [ ] Verify unauthorized access is blocked

### Test Scenarios
1. **Normal Flow**: Lock → Release (by creator)
2. **Assignee Refund Flow**: Lock → Refund by Assignee
3. **Dispute Flow - Refund**: Lock → Retrieve (by owner) → Funds to creator
4. **Dispute Flow - Approve**: Lock → Release by Admin (by owner) → Funds to assignee
5. **Error Cases**: 
   - Lock with insufficient balance
   - Release by non-admin
   - Refund by non-assignee
   - Retrieve/Approve by non-owner
   - Lock duplicate taskId
   - Operations on non-locked escrow

## Integration with Frontend

After deployment, update your frontend environment variables:
```env
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=<deployed_contract_address>
```

## Gas Estimates (Approximate)
- `lockEscrow`: ~80,000 - 100,000 gas
- `releaseEscrow`: ~50,000 - 70,000 gas
- `refundEscrowByAssignee`: ~50,000 - 70,000 gas
- `retrieveEscrow`: ~50,000 - 70,000 gas
- `releaseEscrowByAdmin`: ~50,000 - 70,000 gas

## Events

All escrow operations emit events for off-chain tracking:

- `EscrowLocked`: When escrow is created and locked
- `EscrowReleased`: When escrow is released to assignee
- `EscrowRefunded`: When escrow is refunded to creator (by admin)
- `EscrowRefundedByAssignee`: When escrow is refunded to creator (by assignee)

## Frontend Integration

The frontend automatically:
- Synchronizes escrow status with on-chain state after transactions
- Verifies transaction receipts before updating local state
- Handles all escrow operations through the contract

See `contracts/UPDATES.md` for detailed information about the latest updates.

## Support
For issues or questions, contact the development team.

