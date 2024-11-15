//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

/**
 * @title IETHRegistrarController
 * @dev Interface for interacting with the ETH Registrar Controller in the Ethereum Name Service (ENS).
 */
interface IETHRegistrarController {
  /**
   * @notice Creates a commitment for a name registration.
   * @param name The name to be registered (e.g., "example").
   * @param owner The address of the owner for the name being registered.
   * @param duration The duration (in seconds) for which the name is being registered.
   * @param secret A secret value to ensure commitment integrity (used for revealing during registration).
   * @param resolver The address of the resolver contract (can be set to `address(0)` for default).
   * @param data Additional resolver setup data (e.g., setting records).
   * @param reverseRecord Whether to set the reverse record for the owner's address.
   * @param fuses Optional parameter to set the name's fuses (e.g., to configure name restrictions).
   * @return A bytes32 hash representing the commitment.
   */
  function makeCommitment(
    string memory name,
    address owner,
    uint256 duration,
    bytes32 secret,
    address resolver,
    bytes[] calldata data,
    bool reverseRecord,
    uint16 fuses
  ) external pure returns (bytes32);

  /**
   * @notice Submits a name commitment to the controller.
   * @param commitment The bytes32 commitment hash generated by `makeCommitment`.
   */
  function commit(bytes32 commitment) external;

  /**
   * @notice Registers a name with the ENS.
   * @param name The name to register (e.g., "example").
   * @param owner The address of the new owner of the name.
   * @param duration The registration duration in seconds.
   * @param secret The secret used for the commitment to ensure integrity.
   * @param resolver The address of the resolver contract (can be set to `address(0)` for default).
   * @param data Additional resolver setup data (e.g., setting records).
   * @param reverseRecord Whether to set the reverse record for the owner's address.
   * @param fuses Optional parameter to set the name's fuses (e.g., to configure name restrictions).
   * @dev This function requires payment for the registration fee via `msg.value`.
   */
  function register(
    string calldata name,
    address owner,
    uint256 duration,
    bytes32 secret,
    address resolver,
    bytes[] calldata data,
    bool reverseRecord,
    uint16 fuses
  ) external payable;

  /**
   * @notice Renews an existing ENS name.
   * @param name The name to renew (e.g., "example").
   * @param duration The additional duration (in seconds) to renew the registration.
   * @dev This function requires payment for the renewal fee via `msg.value`.
   */
  function renew(string calldata name, uint256 duration) external payable;
}