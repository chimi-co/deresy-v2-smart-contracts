// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import { SchemaResolver } from "@ethereum-attestation-service/eas-contracts/contracts/resolver/SchemaResolver.sol";
import { IEAS, Attestation } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";

/**
 * @title A sample schema resolver that checks whether the attestation is from a specific attester.
 */
contract AttesterResolver is SchemaResolver {
  address private immutable _targetAttester;

  mapping(bytes32 => Attestation) private attestations;

  constructor(IEAS eas, address targetAttester) SchemaResolver(eas) {
      _targetAttester = targetAttester;
  }

  function onAttest(Attestation calldata attestation, uint256 /*value*/) internal override returns (bool) {
      attestations[attestation.uid] = attestation;
      return attestation.attester == _targetAttester;
  }

  function onRevoke(Attestation calldata /*attestation*/, uint256 /*value*/) internal pure override returns (bool) {
      return true;
  }

  function getRequest(bytes32 attestationUid) public view returns (Attestation memory) {
    return attestations[attestationUid];
  }
}