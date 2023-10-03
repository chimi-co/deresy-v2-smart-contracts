const DeresyResolver = artifacts.require('DeresyResolver')
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
  const easSchemaID = "0x00000000000000000000000000000001"
  // End testing variables ----------
  let deresyResolver
  // Load contract
  before(async ()=> {            
    deresyResolver = await DeresyResolver.new(easContractAddress)
    await deresyResolver.unpause();
  })

  // Create Review Form ----------
  describe('Create Review Form', async () => {
    it("should create a review form if data is correct", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await truffleAssert.passes(deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 }))
      let formsCount = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })
      let reviewForm = await deresyResolver.getReviewForm(formsCount - 1)
      assert.deepEqual(questionsArray, reviewForm.questions)
      assert.deepEqual(questionTypesArray, reviewForm.questionTypes.map( b => { return b.toNumber() }))
    })

    it("should emit a CreatedReviewForm event when a review form is created", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      let tx = await deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let formsCount = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })
      truffleAssert.eventEmitted(tx, 'CreatedReviewForm', (ev) => {
        return ev._formId = formsCount - 1;
      });
    })

    it("should revert if easSchemaID is not valid", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      const invalidEASSchemaID = web3.utils.fromAscii("")
      let choicesArray = [["choice1", "choice2"], []]
      await truffleAssert.reverts(deresyResolver.createReviewForm(invalidEASSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 }))
    })

    it("should revert if questions array is empty", async () => {
      let questionsArray = []
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await truffleAssert.reverts(deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 }))
    })

    it("should revert if questionTypes array is empty", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = []
      let choicesArray = [["choice1", "choice2"], []]
      await truffleAssert.reverts(deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 }))
    })

    it("should revert if questions and questionTypes arrays have different lengths", async () => {
      let questionsArray = ["Q1", "Q2","Q3"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], [], []]
      await truffleAssert.reverts(deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 }))
    })

    it("should revert if questions and choices arrays have different lengths", async () => {
      let questionsArray = ["Q1", "Q2","Q3"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"]]
      await truffleAssert.reverts(deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 }))
    })

    it("should increment reviewFormsTotal value each time a new form is created", async () => {
      let formsCount = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      for (let i = 0; i < 5; i++) {
        await deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
        formsCount += 1
        let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })
        assert.equal(reviewFormsTotal, formsCount)
      }
    })
  })

  // Create Review Request ----------
  describe('Create Review Request', async () => {
    it("should create a review request if data is correct", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRC1"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      await truffleAssert.passes(deresyResolver.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, zeroAddress, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
      let request = await deresyResolver.getRequest(requestName)
      assert.deepEqual(request.reviewers, reviewersArray)
      //converting to string to avoid BN comparison
      assert.deepEqual(request.hypercertIDs.map(h => h.toString()), hypercertsArray.map(h => h.toString()))
      assert.deepEqual(request.hypercertIPFSHashes, hypercertsIPFSHashes)
      assert.equal(request.formIpfsHash, ipfsHash)
      assert.equal(request.rewardPerReview, rewardPerReview1)
      assert.equal(request.reviewFormIndex.toNumber(), reviewFormIndex)
      assert.equal(request.reviews, 0)
      assert.equal(request.isClosed, false)
    })

    it("should create a non payable review request if data is correct", async() => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRCfree"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      await truffleAssert.passes(deresyResolver.createNonPayableRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, reviewFormIndex, { from: ownerAddress }))
      let request = await deresyResolver.getRequest(requestName)
      assert.deepEqual(request.reviewers, reviewersArray)
      //converting to string to avoid BN comparison
      assert.deepEqual(request.hypercertIDs.map(h => h.toString()), hypercertsArray.map(h => h.toString()))
      assert.deepEqual(request.hypercertIPFSHashes, hypercertsIPFSHashes)
      assert.equal(request.formIpfsHash, ipfsHash)
      assert.equal(request.rewardPerReview, 0)
      assert.equal(request.reviewFormIndex.toNumber(), reviewFormIndex)
      assert.equal(request.reviews, 0)
      assert.equal(request.isClosed, false)
    })

    it("should emit a CreatedReviewRequest event when a review request is created", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRC1a"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      let tx = await deresyResolver.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, zeroAddress, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      truffleAssert.eventEmitted(tx, 'CreatedReviewRequest', (ev) => {
        return ev._requestName = requestName;
      });
    })

    it("should revert if addresses array is null", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRC2"
      let reviewersArray = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1

      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, zeroAddress, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1  * hypercertsArray.length }))
    })

    it("should revert if hypercerts array is null", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRC3"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let hypercertsArray = []
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1

      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, zeroAddress, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length }))
    })

    it("should revert if reviewFormIndex is invalid", async () => {
      let requestName = "RRC4"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = 100000

      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, zeroAddress, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
    })

    it("should revert if rewardPerReview <= 0", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRC5"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1

      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, 0, zeroAddress, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
    })

    it("should revert if name is duplicated", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRC6"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      
      await truffleAssert.passes(deresyResolver.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, zeroAddress, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, zeroAddress, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
    })

    it("should revert if msg.value is invalid", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRC7"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1

      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, zeroAddress, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 }))
    })

    it("should pass if ipfsHash is empty", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRC8"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = ""
      let reviewFormIndex = reviewFormsTotal - 1
      
      await truffleAssert.passes(deresyResolver.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, zeroAddress, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
    })

    it("should revert if hypercertsIPFSHashes array is empty", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRC9"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = []
      let ipfsHash = ""
      let reviewFormIndex = reviewFormsTotal - 1
      
      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, zeroAddress, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
    })

    it("should revert if hypercertsIPFSHashes and hypercertIDs arrays have different length", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRC10"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1"]
      let ipfsHash = ""
      let reviewFormIndex = reviewFormsTotal - 1
      
      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, zeroAddress, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
    })

    it("should pass if hypercertsIPFSHashes array contains empty strings", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRC10"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["", ""]
      let ipfsHash = ""
      let reviewFormIndex = reviewFormsTotal - 1
      
      await truffleAssert.passes(deresyResolver.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, zeroAddress, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
    })
  })

  // Close Review Request ----------
  describe('Close Review Request', async () => {
    it("should close a review request if data is correct", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "CRR1"
      let reviewersArray = [reviewerAddress1, reviewerAddress3]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      await deresyResolver.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, zeroAddress, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      await truffleAssert.passes(deresyResolver.closeReviewRequest(requestName, { from: ownerAddress, value: 0 }))
      let request = await deresyResolver.getRequest(requestName)
      assert.equal(request.isClosed, true)
    })

    it("should emit a ClosedReviewRequest event when a review request is closed", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "CRR1a"
      let reviewersArray = [reviewerAddress1, reviewerAddress3]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      await deresyResolver.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, zeroAddress, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      let tx = await deresyResolver.closeReviewRequest(requestName, { from: ownerAddress, value: 0 })
      truffleAssert.eventEmitted(tx, 'ClosedReviewRequest', (ev) => {
        return ev.requestName = requestName;
      });
    })

    it("should revert if sender is not owner", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "CRR2"
      let reviewersArray = [reviewerAddress1, reviewerAddress3]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      await deresyResolver.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, zeroAddress, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      await truffleAssert.reverts(deresyResolver.closeReviewRequest(requestName, { from: reviewerAddress1, value: 0 }))
      let request = await deresyResolver.getRequest(requestName)
      assert.equal(request.isClosed, false)
    })

    it("should revert if is closed", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "CRR3"
      let reviewersArray = [reviewerAddress1, reviewerAddress3]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      await deresyResolver.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, zeroAddress, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
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
      await truffleAssert.reverts(deresyResolver.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 }))
    });

    it("should not let you create request when contract is paused", async() => {
      let requestName = "RRC1-PAUSED"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = 0
      await truffleAssert.reverts(deresyResolver.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, zeroAddress, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length }))
    });
  })
})
