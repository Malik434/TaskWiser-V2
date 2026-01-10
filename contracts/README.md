# TaskWiser Escrow Smart Contract

## Overview
This smart contract handles escrow functionality for TaskWiser platform, allowing secure token locking and release for task payments.

## Features
- Lock tokens in escrow when assignee is assigned
- Release tokens to assignee when task is completed
- Dispute resolution (only contract deployer can retrieve tokens)
- Support for ERC20 tokens (USDC, USDT)

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

### retrieveEscrow
Retrieves tokens back to admin in case of dispute (only deployer can call).
```solidity
function retrieveEscrow(
    bytes32 taskId,
    string calldata reason
) external onlyOwner
```

### getEscrow
View function to get escrow details.
```solidity
function getEscrow(bytes32 taskId) external view returns (Escrow memory)
```

## Security Considerations

1. **Reentrancy Protection**: Contract uses OpenZeppelin's ReentrancyGuard
2. **Access Control**: 
   - Only admin (task creator) can lock/release
   - Only contract owner (deployer) can retrieve in disputes
3. **Input Validation**: All inputs are validated (non-zero addresses, amounts, etc.)
4. **Safe Token Transfers**: Uses OpenZeppelin's SafeERC20 for secure transfers

## Testing

### Manual Testing Checklist
- [ ] Deploy contract to Sepolia
- [ ] Lock escrow with USDC
- [ ] Lock escrow with USDT
- [ ] Release escrow to assignee
- [ ] Retrieve escrow (as owner)
- [ ] Verify unauthorized access is blocked

### Test Scenarios
1. **Normal Flow**: Lock → Release
2. **Dispute Flow**: Lock → Retrieve (by owner)
3. **Error Cases**: 
   - Lock with insufficient balance
   - Release by non-admin
   - Retrieve by non-owner
   - Lock duplicate taskId

## Integration with Frontend

After deployment, update your frontend environment variables:
```env
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=<deployed_contract_address>
```

## Gas Estimates (Approximate)
- `lockEscrow`: ~80,000 - 100,000 gas
- `releaseEscrow`: ~50,000 - 70,000 gas
- `retrieveEscrow`: ~50,000 - 70,000 gas

## Support
For issues or questions, contact the development team.

