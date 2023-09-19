// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./interfaces/IOnReviewable.sol";



contract OnReviewableExample is IOnReviewable {
    struct Review {
      address reviewer;
      string requestName;
      bytes32 attestationID;
    }

    mapping(address => Review) private reviews;

    function onReview(Attestation calldata attestation, string memory requestName) external override {
        reviews[attestation.attester] = Review(attestation.attester, requestName, attestation.uid);
    }
}