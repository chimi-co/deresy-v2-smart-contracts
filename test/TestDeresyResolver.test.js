const DeresyResolver = artifacts.require('DeresyResolver')
const truffleAssert = require("truffle-assertions")
const { assert } = require('chai')
const { ethers } = require('ethers');

contract('TestDeresyResolver', (accounts) => {
  // Start testing variables ----------
  const ownerAddress = accounts[0] // Address that deployed the contract
  const reviewerAddress1 = accounts[1]    
  const reviewerAddress2 = accounts[2]
  const reviewerAddress3 = accounts[3]
  const hypercertID1 = ethers.BigNumber.from(10000218199072539564261652963204804198268928n);
  const hypercertID2 = ethers.BigNumber.from(10000558481439460502725116337812235966480384n);
  const rewardPerReview1 = "10000000000000000"
  const easContractAddress = "0x4200000000000000000000000000000000000021"
  const easSchemaID = "0x00000000000000000000000000000001"
  // End testing variables ----------
  let deresyResolver
  // Load contract
  before(async ()=> {            
    deresyResolver = await DeresyResolver.new(easContractAddress)
  })

  // onAttest ----------
  describe('On Attest', async () => {
    it("should create reviews if data is correct", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRS1"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      await deresyResolver.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      for (let i = 0; i < reviewersArray.length; i++) {
        for (let j = 0; j < targhypercertsArrayetsArray.length; j++) {
          let answersArray = ["Answer 1", "Yes"]
          await truffleAssert.passes(deresyResolver.onAttest(requestName, j, answersArray, { from: reviewersArray[i], value: '0' }))
        }
      }

      let request = await deresyResolver.getRequest(requestName)
      assert.equal(request.reviews.length, hypercertsArray.length * reviewersArray.length)
    })

    it("should revert if reviewer submits review 2 times for the same target", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRS2"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let targetsArray = [target1, target2]
      let targetsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      await deresyResolver.createRequest(requestName, reviewersArray, targetsArray, targetsIPFSHashes, ipfsHash, rewardPerReview1, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * targetsArray.length })
      
      let targetIndex = 0
      let answersArray = ["Answer 1", "Yes"]
      await truffleAssert.passes(deresyResolver.submitReview(requestName, targetIndex, answersArray, { from: reviewerAddress1, value: '0' }))
      await truffleAssert.passes(deresyResolver.submitReview(requestName, targetIndex, answersArray, { from: reviewerAddress2, value: '0' }))
      await truffleAssert.reverts(deresyResolver.submitReview(requestName, targetIndex, answersArray, { from: reviewerAddress1, value: '0' }))
    })

    it("should revert if submit address is not a reviewer", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRS3"
      let reviewersArray = [reviewerAddress1, reviewerAddress3]
      let targetsArray = [target1, target2]
      let targetsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      await deresyResolver.createRequest(requestName, reviewersArray, targetsArray, targetsIPFSHashes, ipfsHash, rewardPerReview1, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * targetsArray.length })
      
      let targetIndex = 0
      let answersArray = ["Answer 1", "Yes"]
      await truffleAssert.reverts(deresyResolver.submitReview(requestName, targetIndex, answersArray, { from: reviewerAddress2, value: '0' }))
    })

    it("should revert if review request is closed", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRS4"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let targetsArray = [target1, target2]
      let targetsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      
      await deresyResolver.createRequest(requestName, reviewersArray, targetsArray, targetsIPFSHashes, ipfsHash, rewardPerReview1, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * targetsArray.length })
      await deresyResolver.closeReviewRequest(requestName, { from: ownerAddress, value: 0 })

      let targetIndex = 0
      let answersArray = ["Answer 1", "Yes"]
      await truffleAssert.reverts(deresyResolver.submitReview(requestName, targetIndex, answersArray, { from: reviewerAddress1, value: '0' }))
    })

    it("should revert if review targetIndex is invalid", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRS5"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let targetsArray = [target1, target2]
      let targetsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      
      await deresyResolver.createRequest(requestName, reviewersArray, targetsArray, targetsIPFSHashes, ipfsHash, rewardPerReview1, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * targetsArray.length })

      let targetIndex = 10
      let answersArray = ["Answer 1", "Yes"]
      await truffleAssert.reverts(deresyResolver.submitReview(requestName, targetIndex, answersArray, { from: reviewerAddress1, value: '0' }))
    })
    
    it("should revert if answersArray length is different from review form questionsArray", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [0, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyResolver.createReviewForm(questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyResolver.reviewFormsTotal().then(b => { return b.toNumber() })
  
      let requestName = "RRS6"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let targetsArray = [target1, target2]
      let targetsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      
      await deresyResolver.createRequest(requestName, reviewersArray, targetsArray, targetsIPFSHashes, ipfsHash, rewardPerReview1, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * targetsArray.length })
      await deresyResolver.closeReviewRequest(requestName, { from: ownerAddress, value: 0 })
  
      let targetIndex = 0
      let answersArray = ["Answer 1", "Yes", "Answer2", "Yes", "Answer 3"]
      await truffleAssert.reverts(deresyResolver.submitReview(requestName, targetIndex, answersArray, { from: reviewerAddress1, value: '0' }))
    })
  })
})