const DeresyResolver = artifacts.require("DeresyResolver");

module.exports = function(deployer) {
  const eas = '0x4200000000000000000000000000000000000021'

  deployer.deploy(DeresyResolver, eas);
};
