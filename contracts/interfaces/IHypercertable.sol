// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/**
 * @dev Interface for Hypercert compliant contract.
 */

interface IHypercertable {
    function uri(uint256 tokenID) external returns (string memory);
}