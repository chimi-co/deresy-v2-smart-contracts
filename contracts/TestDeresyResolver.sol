// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./DeresyResolver.sol"; // Import your original contract

contract TestDeresyResolver is DeresyResolver {
    constructor(IEAS eas) DeresyResolver(eas) {} // Constructor should match the original contract
    function testOnAttest(
        Attestation calldata attestation,
        uint256 value
    ) external returns (bool) {
        // Call the internal function you want to test
        return onAttest(attestation, value);
    }
}