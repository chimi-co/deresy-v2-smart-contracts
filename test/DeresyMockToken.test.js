const DeresyResolver = artifacts.require('DeresyAttestations')
const DeresyMockToken = artifacts.require("DeresyMockToken");
const DeresyERC721MockToken = artifacts.require("DeresyERC721MockToken")
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
  const erc721TokenOwner = accounts[4]
  const hypercertID1 = toBN("10000218199072539564261652963204804198268928");
  const hypercertID2 = toBN("10000558481439460502725116337812235966480384");
  const rewardPerReview1 = "10000000000000000"
  const easContractAddress = "0x4200000000000000000000000000000000000021"
  const reviewsSchemaUID = "0x0000000000000000000000000000000000000000000000000000000000000003"
  const attestationUID ="0x0000000000000000000000000000000000000000000000000000000000000001"
  const reviewsPerHypercert1 = 3
  // End testing variables ----------
  let deresyResolver
  let deresyMockTokens
  let deresyERC721MockToken
  // Load contract
  before(async ()=> {            
    deresyResolver = await DeresyResolver.new(easContractAddress)

    await deresyResolver.unpause();
    await deresyResolver.setValidateHypercertIDs(false)
    await deresyResolver.setReviewsSchemaID(reviewsSchemaUID, { from: ownerAddress })

    deresyMockTokens = await DeresyMockToken.new()

    await deresyMockTokens.mint(ownerAddress, web3.utils.toWei("100", "ether"));
    await deresyResolver.whitelistToken(deresyMockTokens.address, { from: ownerAddress });
    await deresyResolver.setValidateHypercertIDs(false)

    deresyERC721MockToken = await DeresyERC721MockToken.new()
    await deresyERC721MockToken.mint(erc721TokenOwner, web3.utils.toWei("100", "ether"));
  })

  describe('Create Review Request', async () => {
    it("should create a review request if data is correct", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "DMTRF1"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRCMT1"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = [deresyERC721MockToken.address]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"

      const ownerBalanceBefore = await deresyMockTokens.balanceOf(ownerAddress)

      await deresyMockTokens.approve(deresyResolver.address, web3.utils.toWei("1", "ether"));

      await truffleAssert.passes(deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewsPerHypercert1, deresyMockTokens.address, reviewFormName, { from: ownerAddress, value: 0 }))

      const ownerBalanceAfter = await deresyMockTokens.balanceOf(ownerAddress);

      const expectedOwnerBalance = BigInt(ownerBalanceBefore) - BigInt(reviewsPerHypercert1 * rewardPerReview1 * hypercertsArray.length)
      assert.equal(BigInt(ownerBalanceAfter), expectedOwnerBalance);

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

      const requestName = "RRCMT2"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      
      await deresyResolver.unwhitelistToken(deresyMockTokens.address, { from: ownerAddress });

      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewsPerHypercert1, deresyMockTokens.address, reviewFormName, { from: ownerAddress, value: 0 }), "Deresy: Token is not whitelisted")
    })

    it("should not create a review request if msg value is greater than 0", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "DMTRF3"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRCMT3"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      
      await deresyResolver.whitelistToken(deresyMockTokens.address, { from: ownerAddress });

      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewsPerHypercert1, deresyMockTokens.address, reviewFormName, { from: ownerAddress, value: reviewersArray.length * hypercertsArray.length }), "Deresy: msg.value is invalid")
    })
  })

  describe('On Attest', async() => {
    it("should transfer funds to reviewer if attestation is valid using reviewers array", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "DMTRF4"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRCMT4"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = [deresyERC721MockToken.address]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"

      await deresyMockTokens.approve(deresyResolver.address, web3.utils.toWei("1", "ether"));

      await deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewsPerHypercert1, deresyMockTokens.address, reviewFormName, { from: ownerAddress, value: 0 })

      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
        { type: 'string', name: 'notes1' },
        { type: 'string', name: 'notes2' },
        { type: 'string[]', name: 'rfu1' },
        { type: 'string[]', name: 'rfu2' },
      ];
      
      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", [], "", "", [""], [""]]);
      const attestation = {
        uid: attestationUID,
        schema: reviewsSchemaUID,
        attester: reviewerAddress2,
        data: encodedData,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };

      const reviewerAddress2BalanceBefore = await deresyMockTokens.balanceOf(reviewerAddress2);
      truffleAssert.passes(await deresyResolver.deresyAttestation(attestation, { from: reviewerAddress2, value: 0 }))
      let request = await deresyResolver.getRequest(requestName)
      assert.equal(request.reviews.length, 1)
      const reviewerAddress2BalanceAfter = await deresyMockTokens.balanceOf(reviewerAddress2)
      const reviewerAddress2ExpectedBalance = BigInt(reviewerAddress2BalanceBefore) + BigInt(rewardPerReview1)
      assert.equal(reviewerAddress2ExpectedBalance, BigInt(reviewerAddress2BalanceAfter))
    })

    it("should transfer funds to reviewer if attestation is valid using reviewer ERC721 contracts array", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "DMTRF5"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRCMT5"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = [deresyERC721MockToken.address]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"

      await deresyMockTokens.approve(deresyResolver.address, web3.utils.toWei("1", "ether"));

      await deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewsPerHypercert1, deresyMockTokens.address, reviewFormName, { from: ownerAddress, value: 0 })

      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
        { type: 'string', name: 'notes1' },
        { type: 'string', name: 'notes2' },
        { type: 'string[]', name: 'rfu1' },
        { type: 'string[]', name: 'rfu2' },
      ];
      
      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", [], "", "", [""], [""]]);
      const attestation = {
        uid: attestationUID,
        schema: reviewsSchemaUID,
        attester: erc721TokenOwner,
        data: encodedData,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };

      const erc721TokenOwnerBalanceBefore = await deresyMockTokens.balanceOf(erc721TokenOwner);
      truffleAssert.passes(await deresyResolver.deresyAttestation(attestation, { from: erc721TokenOwner, value: 0 }))
      let request = await deresyResolver.getRequest(requestName)
      assert.equal(request.reviews.length, 1)
      const erc721TokenOwnerBalanceAfter = await deresyMockTokens.balanceOf(erc721TokenOwner)
      const erc721TokenOwnerExpectedBalance = BigInt(erc721TokenOwnerBalanceBefore) + BigInt(rewardPerReview1)
      assert.equal(erc721TokenOwnerExpectedBalance, BigInt(erc721TokenOwnerBalanceAfter))
    })
  })
})