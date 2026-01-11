# TaskWiser Escrow Contract Updates

## Overview
The TaskWiserEscrow contract has been updated to support real on-chain payments and dispute resolution functionality.

## New Functions

### 1. `refundEscrowByAssignee(bytes32 taskId, string reason)`
- **Access**: Public (can be called by assignee)
- **Purpose**: Allows the task assignee to refund escrow back to the task creator
- **Use Case**: When assignee wants to cancel or return funds to creator
- **State Change**: `Locked` → `Refunded`
- **Event**: `EscrowRefundedByAssignee`

### 2. `releaseEscrowByAdmin(bytes32 taskId)`
- **Access**: Owner only (platform admin)
- **Purpose**: Allows admin to release escrow to assignee during dispute resolution
- **Use Case**: When admin approves assignee's work after reviewing a dispute
- **State Change**: `Locked` → `Released`
- **Event**: `EscrowReleased`

## Updated Functions

### `retrieveEscrow(bytes32 taskId, string reason)`
- **Access**: Owner only
- **Purpose**: Admin can refund escrow to creator during dispute resolution
- **Use Case**: When admin decides to refund creator instead of releasing to assignee

## Transaction Flow

### 1. Lock Escrow (Task Creator)
```
Task Creator → lockEscrow() → Funds locked in contract
```

### 2. Release Escrow (Task Creator)
```
Task Creator → releaseEscrow() → Funds sent to Assignee
```

### 3. Refund by Assignee
```
Assignee → refundEscrowByAssignee() → Funds returned to Creator
```

### 4. Dispute Resolution - Refund (Admin)
```
Admin (Owner) → retrieveEscrow() → Funds returned to Creator
```

### 5. Dispute Resolution - Approve (Admin)
```
Admin (Owner) → releaseEscrowByAdmin() → Funds sent to Assignee
```

## Events

All escrow operations emit events for off-chain tracking:

- `EscrowLocked`: When escrow is created
- `EscrowReleased`: When escrow is released to assignee (by creator or admin)
- `EscrowRefunded`: When escrow is refunded to creator (by admin)
- `EscrowRefundedByAssignee`: When escrow is refunded to creator (by assignee)

## Security Considerations

1. **Reentrancy Protection**: All state-changing functions use `nonReentrant` modifier
2. **Access Control**: 
   - Only assignee can call `refundEscrowByAssignee`
   - Only task creator can call `releaseEscrow`
   - Only contract owner can call `retrieveEscrow` and `releaseEscrowByAdmin`
3. **State Validation**: All functions check that escrow is in `Locked` state
4. **Safe Transfers**: Uses OpenZeppelin's `SafeERC20` for token transfers

## Frontend Integration

The frontend has been updated to use these new functions:

- **Kanban Board**: Uses `refundEscrowByAssignee` for assignee refunds
- **Admin Page**: Uses `retrieveEscrow` for refunds and `releaseEscrowByAdmin` for approvals
- **Escrow Popup**: Uses existing `lockEscrow` and `releaseEscrow` functions

All transactions are monitored and state is synchronized with Firebase after on-chain confirmation.

