// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./DeresyResolver.sol"; // Import your original contract

contract DeresyAttestations is DeresyResolver {
    constructor(IEAS eas) DeresyResolver(eas) {} // Constructor should match the original contract
    function deresyAttestation(
        Attestation calldata attestation
    ) external returns (bool) {
        // Call the internal function you want to test
        return onAttest(attestation, 0);
    }
}