const AttesterResolver = artifacts.require("AttesterResolver");

module.exports = function(deployer) {
  const eas = '0x1a5650d0ecbca349dd84bafa85790e3e6955eb84'
  const targetAttester = '0xc3689E0F44672CEC04387d6437968f6ead9d3a09'

  deployer.deploy(AttesterResolver, eas, targetAttester);
};
