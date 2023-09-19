// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./interfaces/IOnReviewable.sol";

contract OnReviewableExample is IOnReviewable {
    struct Review {
        address reviewer;
        string requestName;
        Attestation attestation;
    }

    struct ReviewRequest {
      string name;
      Attestation[] attestations;
    }

    mapping(string => ReviewRequest) private reviewRequests;

    function onReview(Attestation calldata attestation, string memory requestName) external override returns (bool) {
        ReviewRequest storage request = reviewRequests[requestName];
        request.attestations.push(attestation);
        return true;
    }

    function getRequestReviews(string memory requestName) public view returns (ReviewRequest memory) {
        ReviewRequest memory request = reviewRequests[requestName];
        return request;
    }
}