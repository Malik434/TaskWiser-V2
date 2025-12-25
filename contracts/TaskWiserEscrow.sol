// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TaskWiserEscrow
 * @dev Escrow contract for TaskWiser platform
 * Locks tokens when assignee is assigned, releases to assignee when task is completed
 * Only deployer can retrieve tokens in case of disputes
 */
contract TaskWiserEscrow is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Escrow status enum
    enum EscrowStatus {
        None,      // Escrow doesn't exist
        Locked,    // Tokens are locked
        Released,  // Tokens released to assignee
        Refunded,  // Tokens refunded to admin (dispute)
        Disputed   // Escrow is under dispute
    }

    // Escrow structure
    struct Escrow {
        bytes32 taskId;           // Unique task identifier
        address token;            // ERC20 token address (USDC/USDT)
        address admin;            // Task creator/admin
        address assignee;         // Task assignee
        uint256 amount;           // Amount locked in escrow
        EscrowStatus status;      // Current escrow status
        uint256 lockedAt;         // Timestamp when locked
        uint256 releasedAt;       // Timestamp when released/refunded
    }

    // Mapping from taskId to Escrow
    mapping(bytes32 => Escrow) public escrows;

    // Events
    event EscrowLocked(
        bytes32 indexed taskId,
        address indexed token,
        address indexed admin,
        address assignee,
        uint256 amount
    );

    event EscrowReleased(
        bytes32 indexed taskId,
        address indexed assignee,
        uint256 amount
    );

    event EscrowRefunded(
        bytes32 indexed taskId,
        address indexed admin,
        uint256 amount,
        string reason
    );

    event EscrowDisputed(
        bytes32 indexed taskId,
        address indexed raisedBy
    );

    event EscrowResolved(
        bytes32 indexed taskId,
        address indexed winner,
        uint256 amount
    );

    /**
     * @dev Constructor sets the deployer as owner
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @dev Lock tokens in escrow
     * @param taskId Unique task identifier (bytes32 hash)
     * @param token ERC20 token address
     * @param assignee Address of the task assignee
     * @param amount Amount of tokens to lock
     */
    function lockEscrow(
        bytes32 taskId,
        address token,
        address assignee,
        uint256 amount
    ) external nonReentrant {
        require(taskId != bytes32(0), "TaskWiserEscrow: Invalid task ID");
        require(token != address(0), "TaskWiserEscrow: Invalid token address");
        require(assignee != address(0), "TaskWiserEscrow: Invalid assignee address");
        require(amount > 0, "TaskWiserEscrow: Amount must be greater than zero");
        require(escrows[taskId].status == EscrowStatus.None, "TaskWiserEscrow: Escrow already exists");

        IERC20 tokenContract = IERC20(token);
        require(
            tokenContract.balanceOf(msg.sender) >= amount,
            "TaskWiserEscrow: Insufficient balance"
        );
        require(
            tokenContract.allowance(msg.sender, address(this)) >= amount,
            "TaskWiserEscrow: Insufficient allowance"
        );

        // Transfer tokens from admin to escrow contract
        tokenContract.safeTransferFrom(msg.sender, address(this), amount);

        // Create escrow record
        escrows[taskId] = Escrow({
            taskId: taskId,
            token: token,
            admin: msg.sender,
            assignee: assignee,
            amount: amount,
            status: EscrowStatus.Locked,
            lockedAt: block.timestamp,
            releasedAt: 0
        });

        emit EscrowLocked(taskId, token, msg.sender, assignee, amount);
    }

    /**
     * @dev Release escrow to assignee (called by admin when task is completed)
     * @param taskId Unique task identifier
     */
    function releaseEscrow(bytes32 taskId) external nonReentrant {
        Escrow storage escrow = escrows[taskId];
        
        require(escrow.status == EscrowStatus.Locked, "TaskWiserEscrow: Escrow not locked");
        require(escrow.admin == msg.sender, "TaskWiserEscrow: Only admin can release");

        IERC20 tokenContract = IERC20(escrow.token);
        uint256 amount = escrow.amount;

        // Update escrow status
        escrow.status = EscrowStatus.Released;
        escrow.releasedAt = block.timestamp;

        // Transfer tokens to assignee
        tokenContract.safeTransfer(escrow.assignee, amount);

        emit EscrowReleased(taskId, escrow.assignee, amount);
    }

    /**
     * @dev Retrieve escrow in case of dispute (only deployer/owner can call)
     * @param taskId Unique task identifier
     * @param reason Reason for refund (for event logging)
     */
    function retrieveEscrow(
        bytes32 taskId,
        string calldata reason
    ) external onlyOwner nonReentrant {
        Escrow storage escrow = escrows[taskId];
        
        require(escrow.status == EscrowStatus.Locked, "TaskWiserEscrow: Escrow not locked");

        IERC20 tokenContract = IERC20(escrow.token);
        uint256 amount = escrow.amount;
        address admin = escrow.admin;

        // Update escrow status
        escrow.status = EscrowStatus.Refunded;
        escrow.releasedAt = block.timestamp;

        // Transfer tokens back to admin
        tokenContract.safeTransfer(admin, amount);

        emit EscrowRefunded(taskId, admin, amount, reason);
    }

    /**
     * @dev Raise a dispute (called by admin or assignee)
     * @param taskId Unique task identifier
     */
    function raiseDispute(bytes32 taskId) external nonReentrant {
        Escrow storage escrow = escrows[taskId];
        
        require(escrow.status == EscrowStatus.Locked, "TaskWiserEscrow: Escrow not locked");
        require(msg.sender == escrow.admin || msg.sender == escrow.assignee, "TaskWiserEscrow: Only participants can dispute");

        escrow.status = EscrowStatus.Disputed;
        
        emit EscrowDisputed(taskId, msg.sender);
    }

    /**
     * @dev Resolve a dispute (called by platform owner)
     * @param taskId Unique task identifier
     * @param winner Address to receive the funds
     */
    function resolveDispute(bytes32 taskId, address winner) external onlyOwner nonReentrant {
        Escrow storage escrow = escrows[taskId];
        
        require(escrow.status == EscrowStatus.Disputed, "TaskWiserEscrow: Task not disputed");
        require(winner == escrow.admin || winner == escrow.assignee, "TaskWiserEscrow: Winner must be a participant");

        IERC20 tokenContract = IERC20(escrow.token);
        uint256 amount = escrow.amount;

        if (winner == escrow.assignee) {
             escrow.status = EscrowStatus.Released;
             emit EscrowReleased(taskId, winner, amount);
        } else {
             escrow.status = EscrowStatus.Refunded;
             emit EscrowRefunded(taskId, winner, amount, "Dispute resolved by admin");
        }
        
        escrow.releasedAt = block.timestamp;
        
        // Transfer tokens
        tokenContract.safeTransfer(winner, amount);
        
        emit EscrowResolved(taskId, winner, amount);
    }

    /**
     * @dev Get escrow details
     * @param taskId Unique task identifier
     * @return Escrow struct
     */
    function getEscrow(bytes32 taskId) external view returns (Escrow memory) {
        return escrows[taskId];
    }

    /**
     * @dev Check if escrow exists and is locked
     * @param taskId Unique task identifier
     * @return bool True if escrow is locked
     */
    function isEscrowLocked(bytes32 taskId) external view returns (bool) {
        return escrows[taskId].status == EscrowStatus.Locked;
    }

    /**
     * @dev Get escrow status
     * @param taskId Unique task identifier
     * @return EscrowStatus Current status
     */
    function getEscrowStatus(bytes32 taskId) external view returns (EscrowStatus) {
        return escrows[taskId].status;
    }
}

