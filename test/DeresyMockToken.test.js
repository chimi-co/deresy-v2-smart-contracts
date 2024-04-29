const DeresyResolver = artifacts.require('DeresyAttestations')
const DeresyMockToken = artifacts.require("DeresyMockToken");
const truffleAssert = require("truffle-assertions")
const { assert } = require('chai')
const BN = require("bn.js")

function toBN(number) {
  return new BN(number)
}

contract('DeresyMockToken', (accounts) => {
  // Start testing variables ----------
  const ownerAddress = accounts[0] // Address that deployed the contract
  const reviewerAddress1 = accounts[1] 
  const reviewerAddress2 = accounts[2]
  const reviewerAddress3 = accounts[3]
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const hypercertID1 = toBN("10000218199072539564261652963204804198268928");
  const hypercertID2 = toBN("10000558481439460502725116337812235966480384");
  const rewardPerReview1 = "10000000000000000"
  const easContractAddress = "0x4200000000000000000000000000000000000021"
  const reviewsSchemaUID = "0x0000000000000000000000000000000000000000000000000000000000000003"
  // End testing variables ----------
  let deresyResolver
  let deresyMockTokens
  // Load contract
  before(async ()=> {            
    deresyResolver = await DeresyResolver.new(easContractAddress)

    await deresyResolver.unpause();

    deresyMockTokens = await DeresyMockToken.new()

    await deresyMockTokens.mint(ownerAddress, web3.utils.toWei("100", "ether"));
    await deresyResolver.whitelistToken(deresyMockTokens.address, { from: ownerAddress });
    await deresyResolver.setValidateHypercertIDs(false)
  })

  describe('Create Review Request', async () => {
    it("should create a review request if data is correct", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "DMTRF1"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRC1"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"

      await deresyMockTokens.approve(deresyResolver.address, web3.utils.toWei("1", "ether"));

      await truffleAssert.passes(deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, deresyMockTokens.address, reviewFormName, { from: ownerAddress, value: 0 }))

      const balanceAfter = await deresyMockTokens.balanceOf(ownerAddress);
      assert.equal(balanceAfter.toString(), web3.utils.toWei("99.94", "ether"));

      let request = await deresyResolver.getRequest(requestName)
      assert.deepEqual(request.reviewers, reviewersArray)
      assert.deepEqual(request.hypercertIDs.map(h => h.toString()), hypercertsArray.map(h => h.toString()))
      assert.deepEqual(request.hypercertIPFSHashes, hypercertsIPFSHashes)
      assert.equal(request.formIpfsHash, ipfsHash)
      assert.equal(request.rewardPerReview, rewardPerReview1)
      assert.equal(request.reviewFormName, reviewFormName)
      assert.equal(request.reviews, 0)
      assert.equal(request.isClosed, false)
    })

    it("should not create a review request if ERC-20 Token permission is not granted", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "DMTRF2"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRC1"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"

      // In this line, ERC-20 token approval should be done, for test purposes we don't use it.

      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, deresyMockTokens.address, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
    })
  })

  describe('On Attest', async() => {

  })
})