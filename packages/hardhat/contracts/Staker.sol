// SPDX-License-Identifier: MIT
pragma solidity 0.8.20; //Do not change the solidity version as it negatively impacts submission grading

import "hardhat/console.sol";
import "./ExampleExternalContract.sol";

contract Staker {
    ExampleExternalContract public exampleExternalContract;

    // Events
    event Stake(address indexed sender, uint256 amount);
    event Withdraw(address indexed sender, uint256 amount);
    event Execute(uint256 contractBalance);

    // State variables
    mapping(address => uint256) public balances;
    uint256 public constant threshold = 1 ether;
    uint256 public deadline = block.timestamp + 30 seconds;
    bool public openForWithdraw = false;

    constructor(address exampleExternalContractAddress) {
        exampleExternalContract = ExampleExternalContract(exampleExternalContractAddress);
    }

    // Collect funds in a payable `stake()` function and track individual `balances` with a mapping
    function stake() public payable {
        // Ensure the contract is not completed
        require(!exampleExternalContract.completed(), "Staking period has completed");
        
        // Update the user's balance
        balances[msg.sender] += msg.value;
        
        // Emit the event for the frontend
        emit Stake(msg.sender, msg.value);
    }

    // After the `deadline` allow anyone to call an `execute()` function
    function execute() public {
        // Check if the deadline has passed
        require(block.timestamp >= deadline, "Deadline has not passed yet");
        
        // Check if the contract is not already completed
        require(!exampleExternalContract.completed(), "Contract already completed");
        
        // Check if the threshold is met
        if (address(this).balance >= threshold) {
            // If the threshold is met, call the external contract's complete function
            exampleExternalContract.complete{value: address(this).balance}();
            emit Execute(address(this).balance);
        } else {
            // If the threshold is not met, allow users to withdraw their funds
            openForWithdraw = true;
        }
    }

    // If the `threshold` was not met, allow everyone to call a `withdraw()` function to withdraw their balance
    function withdraw() public {
        // Check if the contract is open for withdrawals
        require(openForWithdraw, "Not open for withdraw");
        
        // Check if the user has a balance to withdraw
        require(balances[msg.sender] > 0, "No balance to withdraw");
        
        // Store the user's balance in a temporary variable
        uint256 userBalance = balances[msg.sender];
        
        // Reset the user's balance to 0 before sending to prevent re-entrancy attacks
        balances[msg.sender] = 0;
        
        // Send the user's balance back to them
        (bool success, ) = msg.sender.call{value: userBalance}("");
        require(success, "Transfer failed");
        
        // Emit the withdraw event
        emit Withdraw(msg.sender, userBalance);
    }

    // Add a `timeLeft()` view function that returns the time left before the deadline for the frontend
    function timeLeft() public view returns (uint256) {
        if (block.timestamp >= deadline) {
            return 0;
        } else {
            return deadline - block.timestamp;
        }
    }

    // Add the `receive()` special function that receives eth and calls stake()
    receive() external payable {
        stake();
    }
}
