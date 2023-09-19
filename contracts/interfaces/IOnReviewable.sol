// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/**
 * @dev Interface of an ERC721ABurnable compliant contract.
 */
import { Attestation } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";

interface IOnReviewable {
    function onReview(Attestation calldata attestation, string memory requestName) external returns (bool);
}