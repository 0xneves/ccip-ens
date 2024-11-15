// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {OwnerIsCreator} from "@chainlink/contracts-ccip/src/v0.8/shared/access/OwnerIsCreator.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {CCIPReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import {IERC20} from "@chainlink/contracts-ccip/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@chainlink/contracts-ccip/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/utils/SafeERC20.sol";
import {IETHRegistrarController} from "./IETHRegistrarController.sol";

/// @title - A simple messenger contract for transferring/receiving tokens and data across chains.
/// @dev - This example shows how to recover tokens in case of revert
contract CCIPL1 is CCIPReceiver, OwnerIsCreator {
  using SafeERC20 for IERC20;

  // Custom errors to provide more descriptive revert messages.
  error NothingToWithdraw(); // Used when trying to withdraw Ether but there's nothing to withdraw.
  error FailedToWithdrawEth(address owner, address target, uint256 value); // Used when the withdrawal of Ether fails.
  error SourceChainNotAllowed(uint64 sourceChainSelector); // Used when the source chain has not been allowlisted by the contract owner.
  error SenderNotAllowed(address sender); // Used when the sender has not been allowlisted by the contract owner.
  error OnlySelf(); // Used when a function is called outside of the contract itself.

  // Event emitted when a message fails to be processed.
  event MessageFailed(bytes32 messageId, address sender, uint256 value);

  // Event emitted when a message is received from another chain.
  event MessageReceived(
    bytes32 indexed messageId, // The unique ID of the CCIP message.
    uint64 indexed sourceChainSelector, // The chain selector of the source chain.
    address sender // The address of the sender from the source chain.
  );

  // Mapping to keep track of allowlisted source chains.
  mapping(uint64 => bool) public allowlistedSourceChains;

  // Mapping to keep track of allowlisted senders.
  mapping(address => bool) public allowlistedSenders;

  IETHRegistrarController private s_ethRegistrar;

  /// @dev Modifier to allow only the contract itself to execute a function.
  /// Throws an exception if called by any account other than the contract itself.
  modifier onlySelf() {
    if (msg.sender != address(this)) revert OnlySelf();
    _;
  }

  /// @notice Constructor initializes the contract with the router address.
  /// @param _router The address of the router contract.
  /// @param _registrar The address of the ETH registrar controller contract.
  constructor(address _router, address _registrar) CCIPReceiver(_router) {
    s_ethRegistrar = IETHRegistrarController(_registrar);
  }

  /// @dev Modifier that checks if the chain with the given sourceChainSelector is allowlisted and if the sender is allowlisted.
  /// @param _sourceChainSelector The selector of the destination chain.
  /// @param _sender The address of the sender.
  modifier onlyAllowlisted(uint64 _sourceChainSelector, address _sender) {
    if (!allowlistedSourceChains[_sourceChainSelector])
      revert SourceChainNotAllowed(_sourceChainSelector);
    if (!allowlistedSenders[_sender]) revert SenderNotAllowed(_sender);
    _;
  }

  /// @dev Updates the allowlist status of a source chain
  /// @notice This function can only be called by the owner.
  /// @param _sourceChainSelector The selector of the source chain to be updated.
  /// @param allowed The allowlist status to be set for the source chain.
  function allowlistSourceChain(
    uint64 _sourceChainSelector,
    bool allowed
  ) external onlyOwner {
    allowlistedSourceChains[_sourceChainSelector] = allowed;
  }

  /// @dev Updates the allowlist status of a sender for transactions.
  /// @notice This function can only be called by the owner.
  /// @param _sender The address of the sender to be updated.
  /// @param allowed The allowlist status to be set for the sender.
  function allowlistSender(address _sender, bool allowed) external onlyOwner {
    allowlistedSenders[_sender] = allowed;
  }

  /// @notice The entrypoint for the CCIP router to call. This function should
  /// never revert, all errors should be handled internally in this contract.
  /// @param any2EvmMessage The message to process.
  /// @dev Extremely important to ensure only router calls this.
  function ccipReceive(
    Client.Any2EVMMessage calldata any2EvmMessage
  )
    external
    override
    onlyRouter
    onlyAllowlisted(
      any2EvmMessage.sourceChainSelector,
      abi.decode(any2EvmMessage.sender, (address))
    )
  {
    try this.processMessage(any2EvmMessage) {
      // Intentionally empty in this example; no action needed if processMessage succeeds
    } catch (bytes memory) {
      (uint256 ENSFunction, address sender, uint256 value, ) = abi.decode(
        any2EvmMessage.data,
        (uint256, address, uint256, bytes)
      );

      if (ENSFunction == 1) {
        // Fees because takes effor to move ether to L1 hahaha
        (bool success, ) = sender.call{value: (value * 9) / 10}("");
        if (!success) revert("failed to send cashback");
      }

      emit MessageFailed(any2EvmMessage.messageId, sender, value);
    }
  }

  /// @dev Processes the message received from another chain using try catch.
  /// In case the remaining of the code fails, it will not revert but rather reinburse the sender and emit an event.
  function processMessage(
    Client.Any2EVMMessage calldata any2EvmMessage
  )
    external
    onlySelf
    onlyAllowlisted(
      any2EvmMessage.sourceChainSelector,
      abi.decode(any2EvmMessage.sender, (address))
    )
  {
    _ccipReceive(any2EvmMessage);
  }

  function _ccipReceive(
    Client.Any2EVMMessage memory any2EvmMessage
  ) internal override {
    (uint256 ENSFunction, , uint256 value, bytes memory data) = abi.decode(
      any2EvmMessage.data,
      (uint256, address, uint256, bytes)
    );

    // In case the ENSFunction is 0, it means the name is being committed.
    if (ENSFunction == 0) {
      commit(data);
    } else {
      // Otherwise, the name is being registered.
      register(value, data);
    }

    emit MessageReceived(
      any2EvmMessage.messageId,
      any2EvmMessage.sourceChainSelector, // fetch the source chain identifier (aka selector)
      abi.decode(any2EvmMessage.sender, (address)) // abi-decoding of the sender address
    );
  }

  /// @dev Commits the name received from another chain to the registrar.
  /// @param _data The data containing the name to be committed.
  function commit(bytes memory _data) internal {
    bytes32 commitment = abi.decode(_data, (bytes32));
    IETHRegistrarController(s_ethRegistrar).commit(commitment);
  }

  /// @dev Registers the name received from another chain to the registrar.
  /// @param _data The data containing the name to be registered.
  function register(uint256 _value, bytes memory _data) internal {
    // Decode all parameters encoded on the L2
    (
      string memory name,
      address owner,
      uint256 duration,
      bytes32 secret,
      address resolver,
      bytes[] memory data,
      bool reverseRecord,
      uint16 fuses
    ) = abi.decode(
        _data,
        (string, address, uint256, bytes32, address, bytes[], bool, uint16)
      );

    // Register the name in the ENS Registrar
    IETHRegistrarController(s_ethRegistrar).register{value: _value}(
      name,
      owner,
      duration,
      secret,
      resolver,
      data,
      reverseRecord,
      fuses
    );
  }

  /// @notice Fallback function to allow the contract to receive Ether.
  /// @dev This function has no function body, making it a default function for receiving Ether.
  /// It is automatically called when Ether is sent to the contract without any data.
  receive() external payable {}

  /// @notice Allows the contract owner to withdraw the entire balance of Ether from the contract.
  /// @dev This function reverts if there are no funds to withdraw or if the transfer fails.
  /// It should only be callable by the owner of the contract.
  /// @param _beneficiary The address to which the Ether should be sent.
  function withdraw(address _beneficiary) public onlyOwner {
    // Retrieve the balance of this contract
    uint256 amount = address(this).balance;

    // Revert if there is nothing to withdraw
    if (amount == 0) revert NothingToWithdraw();

    // Attempt to send the funds, capturing the success status and discarding any return data
    (bool sent, ) = _beneficiary.call{value: amount}("");

    // Revert if the send failed, with information about the attempted transfer
    if (!sent) revert FailedToWithdrawEth(msg.sender, _beneficiary, amount);
  }

  /// @notice Allows the owner of the contract to withdraw all tokens of a specific ERC20 token.
  /// @dev This function reverts with a 'NothingToWithdraw' error if there are no tokens to withdraw.
  /// @param _beneficiary The address to which the tokens will be sent.
  /// @param _token The contract address of the ERC20 token to be withdrawn.
  function withdrawToken(
    address _beneficiary,
    address _token
  ) public onlyOwner {
    // Retrieve the balance of this contract
    uint256 amount = IERC20(_token).balanceOf(address(this));

    // Revert if there is nothing to withdraw
    if (amount == 0) revert NothingToWithdraw();

    IERC20(_token).safeTransfer(_beneficiary, amount);
  }
}
