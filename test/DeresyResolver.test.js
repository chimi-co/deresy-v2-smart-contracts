const DeresyResolver = artifacts.require('DeresyResolver')
const DeresyMockToken = artifacts.require("DeresyMockToken");
const DeresyERC721MockToken = artifacts.require("DeresyERC721MockToken")
const truffleAssert = require("truffle-assertions")
const { assert } = require('chai')
const BN = require("bn.js")

function toBN(number) {
  return new BN(number)
}

contract('DeresyResolver', (accounts) => {
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
  const easReviewsID1 = "0x0000000000000000000000000000000000000000000000000000000000000002"
  const easReviewsID2 = "0x0000000000000000000000000000000000000000000000000000000000000004"
  const easAmendmentsID1 = "0x0000000000000000000000000000000000000000000000000000000000000003"
  const easAmendmentsID2 = "0x0000000000000000000000000000000000000000000000000000000000000005"
  const reviewerContractAddress1 = "0x4200000000000000000000000000000000000000"
  const reviewerContractAddress2 = "0x4200000000000000000000000000000000000001"
  const reviewerContractAddress3 = "0x4200000000000000000000000000000000000002"
  // End testing variables ----------
  let deresyResolver
  let deresyERC721MockToken
  let deresyMockToken
  // Load contract
  before(async ()=> {
    deresyERC721MockToken = await DeresyERC721MockToken.new()
    deresyMockToken = await DeresyMockToken.new()
    deresyResolver = await DeresyResolver.new(easContractAddress)
    await deresyResolver.unpause();
    await deresyResolver.setValidateHypercertIDs(false)
  })

  describe('Ownership', async () => {
    it("should be owned by the deployer", async () => {
      let owner = await deresyResolver.owner()
      assert.equal(owner, ownerAddress)
    })

    it("should be able to transfer ownership if owner", async () => {
      await deresyResolver.transferOwnership(reviewerAddress1, { from: ownerAddress })
      let newOwner = await deresyResolver.owner()
      assert.equal(newOwner, reviewerAddress1)
    })
/*
    it("should revert if not owner tries to transfer ownership", async () => {
      await truffleAssert.reverts(deresyResolver.transferOwnership(reviewerAddress2, { from: reviewerAddress1 }))
      let newOwner = await deresyResolver.owner()
      assert.equal(newOwner, reviewerAddress1)
    }) */
  })

  // Create Review Form ----------
  describe('Create Review Form', async () => {
    it("should create a review form if data is correct", async () => {
      await deresyResolver.transferOwnership(ownerAddress, { from: reviewerAddress1 })
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = ["2", "1"]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF1"
      await truffleAssert.passes(deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 }))
      const reviewForm = await deresyResolver.getReviewForm(reviewFormName)
      assert.deepEqual(questionsArray, reviewForm.questions)
      assert.deepEqual(questionTypesArray, reviewForm.questionTypes)
      assert.deepEqual(questionsArray, reviewForm.questions)
      assert.deepEqual(questionTypesArray, reviewForm.questionTypes)
      assert.deepEqual(choicesArray, reviewForm.choices)
    })

    it("should emit a CreatedReviewForm event when a review form is created", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF2"
      let tx = await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      truffleAssert.eventEmitted(tx, 'CreatedReviewForm', (ev) => {
        return ev._formName = reviewFormName;
      });
    })

    it("should return all the names of the created forms", async () => {
      const initialReviewFormsNames = await deresyResolver.getReviewFormsNames()
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      let reviewFormName = "RF2a"
      await truffleAssert.passes(deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 }))

      questionsArray = ["Q1", "Q2"]
      questionTypesArray = [2, 1]
      choicesArray = [["choice1", "choice2"], []]
      reviewFormName = "RF2b"
      await truffleAssert.passes(deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 }))

      questionsArray = ["Q1", "Q2"]
      questionTypesArray = [2, 1]
      choicesArray = [["choice1", "choice2"], []]
      reviewFormName = "RF2c"
      await truffleAssert.passes(deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 }))
      const expectedReviewFormsNames = initialReviewFormsNames.concat(["RF2a", "RF2b", "RF2c"])
      const allReviewFormsNames = await deresyResolver.getReviewFormsNames()
      assert.deepEqual(allReviewFormsNames, expectedReviewFormsNames)
    })

    it("should revert if questions array is empty", async () => {
      let questionsArray = []
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF3"
      await truffleAssert.reverts(deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 }))
    })

    it("should revert if questionTypes array is empty", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = []
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF4"
      await truffleAssert.reverts(deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 }))
    })

    it("should revert if questions and questionTypes arrays have different lengths", async () => {
      let questionsArray = ["Q1", "Q2","Q3"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], [], []]
      const reviewFormName = "RF5"
      await truffleAssert.reverts(deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 }))
    })

    it("should revert if questions and choices arrays have different lengths", async () => {
      let questionsArray = ["Q1", "Q2","Q3"]
      let questionTypesArray = [2, 1, 2]
      let choicesArray = [["choice1", "choice2"]]
      const reviewFormName = "RF6"
      await truffleAssert.reverts(deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 }))
    })

    it("should revert if reviewRequestName is empty", async () => {
      let questionsArray = ["Q1", "Q2","Q3"]
      let questionTypesArray = [2, 1, 2]
      let choicesArray = [["choice1", "choice2"], [], []]
      const reviewFormName = ""
      await truffleAssert.reverts(deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 }))
    })

    it("should revert if reviewRequestName already exists", async () => {
      let questionsArray = ["Q1", "Q2","Q3"]
      let questionTypesArray = [2, 1, 2]
      let choicesArray = [["choice1", "choice2"], [], []]
      const reviewFormName = "RF1"
      await truffleAssert.reverts(deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 }))
    })
  })

  // Create Review Request ----------
  describe('Create Review Request', async () => {
    it("should create a review request if data is correct", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF7"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      let requestName = "RRC1"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = [deresyERC721MockToken.address]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      await truffleAssert.passes(deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
      let request = await deresyResolver.getRequest(requestName)
      assert.deepEqual(request.reviewers, reviewersArray)
      //converting to string to avoid BN comparison
      assert.deepEqual(request.hypercertIDs.map(h => h.toString()), hypercertsArray.map(h => h.toString()))
      assert.deepEqual(request.hypercertIPFSHashes, hypercertsIPFSHashes)
      assert.equal(request.formIpfsHash, ipfsHash)
      assert.equal(request.rewardPerReview, rewardPerReview1)
      assert.equal(request.reviewFormName, reviewFormName)
      assert.equal(request.reviews, 0)
      assert.equal(request.isClosed, false)
    })

    it("should create a non payable review request if data is correct", async() => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF8"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      let requestName = "RRCfree"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      await truffleAssert.passes(deresyResolver.createNonPayableRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, reviewFormName, { from: ownerAddress }))
      let request = await deresyResolver.getRequest(requestName)
      assert.deepEqual(request.reviewers, reviewersArray)
      //converting to string to avoid BN comparison
      assert.deepEqual(request.hypercertIDs.map(h => h.toString()), hypercertsArray.map(h => h.toString()))
      assert.deepEqual(request.hypercertIPFSHashes, hypercertsIPFSHashes)
      assert.equal(request.formIpfsHash, ipfsHash)
      assert.equal(request.rewardPerReview, 0)
      assert.equal(request.reviewFormName, reviewFormName)
      assert.equal(request.reviews, 0)
      assert.equal(request.isClosed, false)
    })

    it("should emit a CreatedReviewRequest event when a review request is created", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF9"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      let requestName = "RRC1a"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let tx = await deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      truffleAssert.eventEmitted(tx, 'CreatedReviewRequest', (ev) => {
        return ev._requestName = requestName;
      });
    })

    it("should create a review request if reviewer contracts is defined and reviewer addresses array is empty", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF7-1"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      let requestName = "RRC1-1"
      let reviewersArray = []
      let reviewersContracts = [deresyERC721MockToken.address]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      await truffleAssert.passes(deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
      let request = await deresyResolver.getRequest(requestName)
      assert.deepEqual(request.reviewers, reviewersArray)
      assert.deepEqual(request.reviewerContracts, reviewersContracts)
      //converting to string to avoid BN comparison
      assert.deepEqual(request.hypercertIDs.map(h => h.toString()), hypercertsArray.map(h => h.toString()))
      assert.deepEqual(request.hypercertIPFSHashes, hypercertsIPFSHashes)
      assert.equal(request.formIpfsHash, ipfsHash)
      assert.equal(request.rewardPerReview, rewardPerReview1)
      assert.equal(request.reviewFormName, reviewFormName)
      assert.equal(request.reviews, 0)
      assert.equal(request.isClosed, false)
    })

    it("should revert if reviwer addresses and reviewer contracts arrays are null", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF10"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      let requestName = "RRC2"
      let reviewersArray = []
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"

      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1  * hypercertsArray.length }))
    })

    it("should revert when trying to create a payable review request rewardPerReviw has 0 value", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF7-ZeroReward"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      let requestName = "RRC1-ZeroReward"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, 0, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }), "Deresy: Reward per review must be greater than zero for payed requests")
    })

    it("should revert if hypercerts a provided reviewerContract is not ERC721", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF11-ERC721"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      let requestName = "RRC3-ERC721"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = [deresyERC721MockToken.address, deresyMockToken.address]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"

      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length }), "Deresy: Not all reviewer contracts are ERC721 contracts")
    })

    it("should revert if hypercerts array is null", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF11"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      let requestName = "RRC3"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = []
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"

      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length }))
    })

    it("should revert if reviewFormName is invalid", async () => {
      let requestName = "RRC4"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormName = "InavildReviewFormName"

      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
    })

    it("should revert if rewardPerReview <= 0", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF12"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      let requestName = "RRC5"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"

      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, 0, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
    })

    it("should revert if name is duplicated", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF12a"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      let requestName = "RRC6"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      
      await truffleAssert.passes(deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
    })

    it("should revert if name is duplicated", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF12b"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      let requestName = ""
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      
      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
    })

    it("should revert if msg.value is invalid", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF13"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      let requestName = "RRC7"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"

      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 }))
    })

    it("should pass if ipfsHash is empty", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF14"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      let requestName = "RRC8"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = ""
      
      await truffleAssert.passes(deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
    })

    it("should revert if hypercertsIPFSHashes array is empty", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF15"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      let requestName = "RRC9"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = []
      let ipfsHash = ""
      
      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
    })

    it("should revert if hypercertsIPFSHashes and hypercertIDs arrays have different length", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      const reviewFormName = "RF16"
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      let requestName = "RRC10"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1"]
      let ipfsHash = ""
      
      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
    })

    it("should pass if hypercertsIPFSHashes array contains empty strings", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF17"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      let requestName = "RRC10"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["", ""]
      let ipfsHash = ""
      
      await truffleAssert.passes(deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
    })
  })

  // Close Review Request ----------
  describe('Close Review Request', async () => {
    it("should close a review request if data is correct", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF18"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      let requestName = "CRR1"
      let reviewersArray = [reviewerAddress1, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"

      await deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      await truffleAssert.passes(deresyResolver.closeReviewRequest(requestName, { from: ownerAddress, value: 0 }))
      let request = await deresyResolver.getRequest(requestName)
      assert.equal(request.isClosed, true)
    })

    it("should emit a ClosedReviewRequest event when a review request is closed", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF19"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      let requestName = "CRR1a"
      let reviewersArray = [reviewerAddress1, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      
      await deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      let tx = await deresyResolver.closeReviewRequest(requestName, { from: ownerAddress, value: 0 })
      truffleAssert.eventEmitted(tx, 'ClosedReviewRequest', (ev) => {
        return ev.requestName = requestName;
      });
    })

    it("should revert if sender is not owner", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF20"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      let requestName = "CRR2"
      let reviewersArray = [reviewerAddress1, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      
      await deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      await truffleAssert.reverts(deresyResolver.closeReviewRequest(requestName, { from: reviewerAddress1, value: 0 }))
      let request = await deresyResolver.getRequest(requestName)
      assert.equal(request.isClosed, false)
    })

    it("should revert if is closed", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF21"
      await deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      let requestName = "CRR3"
      let reviewersArray = [reviewerAddress1, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      
      await deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      deresyResolver.closeReviewRequest(requestName, { from: ownerAddress, value: 0 })
      await truffleAssert.reverts(deresyResolver.closeReviewRequest(requestName, { from: ownerAddress, value: 0 }))
      let request = await deresyResolver.getRequest(requestName)
      assert.equal(request.isClosed, true)
    })
  })

  describe('Paused/Not Paused Functionality', async () => {
    const notOwner = "0x0582748BEd4B4635D07991Fc14F546Fdfc9617ae"

    it("should be paused", async () => {
      await deresyResolver.pause();
      const isPaused = await deresyResolver.paused();
      assert.equal(isPaused, true);
    });
    
    it("should only allow OWNER to unpause", async () => {
      await truffleAssert.reverts(deresyResolver.unpause({ from: notOwner }));
    });
    
    it("should be able to unpause", async () => {
      await deresyResolver.unpause();
      let isPaused = await deresyResolver.paused();
      assert.equal(isPaused, false);
      
      await deresyResolver.pause();
      isPaused = await deresyResolver.paused();
      assert.equal(isPaused, true);
    });

    it("should not let you create review form when contract is paused", async() => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RF1-PAUSED"
      await truffleAssert.reverts(deresyResolver.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 }))
    });

    it("should not let you create request when contract is paused", async() => {
      let requestName = "RRC1-PAUSED"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      const reviewFormName = "RF1"
      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
    });
  })

  describe('Set EAS schemas UIDs', async () => {
    it("should allow setting reviewsSchemaID by owner", async () => {
      await deresyResolver.setReviewsSchemaID(easReviewsID1, { from: ownerAddress })
      let reviewsSchemaID = await deresyResolver.reviewsSchemaID()
      assert.equal(reviewsSchemaID, easReviewsID1)
    })

    it("should revert if setting reviewsSchemaID by NOT owner", async () => {
      await truffleAssert.reverts(deresyResolver.setReviewsSchemaID(easReviewsID2, { from: reviewerAddress1 }))
      let reviewsSchemaID = await deresyResolver.reviewsSchemaID()
      assert.notEqual(reviewsSchemaID, easReviewsID2)
    })

    it("should allow setting amendmentsSchemaID by owner", async () => {
      await deresyResolver.setAmendmentsSchemaID(easAmendmentsID1, { from: ownerAddress })
      let amendmentsSchemaID = await deresyResolver.amendmentsSchemaID()
      assert.equal(amendmentsSchemaID, easAmendmentsID1)
    })

    it("should revert if setting amendmentsSchemaID by NOT owner", async () => {
      await truffleAssert.reverts(deresyResolver.setAmendmentsSchemaID(easAmendmentsID2, { from: reviewerAddress1 }))
      let amendmentsSchemaID = await deresyResolver.amendmentsSchemaID()
      assert.notEqual(amendmentsSchemaID, easAmendmentsID2)
    })
  })
})
