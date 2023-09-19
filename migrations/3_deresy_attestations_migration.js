const DeresyAttestations = artifacts.require("DeresyAttestations");

module.exports = function(deployer) {
  const eas = '0x4200000000000000000000000000000000000021'

  deployer.deploy(DeresyAttestations, eas);
};
