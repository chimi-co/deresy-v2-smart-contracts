const DeresyAttestations = artifacts.require('DeresyAttestations')
const OnReviewableExample = artifacts.require('OnReviewableExample')
const truffleAssert = require("truffle-assertions")
const { assert } = require('chai')
const BN = require("bn.js")

function toBN(number) {
  return new BN(number)
}

contract('OnReviewableExample', (accounts) => {
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
  const attestationUID1 ="0x0000000000000000000000000000000000000000000000000000000000000001"
  const attestationUID2 ="0x0000000000000000000000000000000000000000000000000000000000000002"
  const reviewsSchemaUID = "0x0000000000000000000000000000000000000000000000000000000000000003"
  const amendmentsSchemaUID = "0x0000000000000000000000000000000000000000000000000000000000000004"
  // End testing variables ----------
  let deresyAttestations
  let onReviewableExample
  // Load contract
  before(async ()=> {            
    deresyAttestations = await DeresyAttestations.new(easContractAddress)
    await deresyAttestations.unpause()
    await deresyAttestations.setValidateHypercertIDs(false)
    await deresyAttestations.setReviewsSchemaID(reviewsSchemaUID, { from: ownerAddress })
    await deresyAttestations.setAmendmentsSchemaID(amendmentsSchemaUID, { from: ownerAddress })
    onReviewableExample = await OnReviewableExample.new()
  })

  // onAttest ----------
  describe('OnReview', async () => {
    it("should allow setting callback contract by owner", async () => {
      await deresyAttestations.setCallbackContract(onReviewableExample.address, { from: ownerAddress })
      let callbackContractAddress = await deresyAttestations.callbackContract()
      assert.equal(callbackContractAddress, onReviewableExample.address)
    })

    it("should revert if setting callback contract by NOT owner", async () => {
      await truffleAssert.reverts(deresyAttestations.setCallbackContract(onReviewableExample.address, { from: reviewerAddress1 }))
    })

    it("should trigger the onReview callback in onReviewableExample contract when review is created", async () => {
      await deresyAttestations.setCallbackContract(onReviewableExample.address, { from: ownerAddress })

      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "ORERF1"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "ORE1"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      
      await deresyAttestations.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })

      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];

      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, "pdfIpfsHash", []]);
      const attestation1 = {
        uid: attestationUID1,
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
      await deresyAttestations.deresyAttestation(attestation1, { from: reviewerAddress2, value: 0 })

      const encodedData2 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID2, answersArray, "pdfIpfsHash", []]);
      const attestation2 = {
        uid: attestationUID2,
        schema: reviewsSchemaUID,
        attester: reviewerAddress2,
        data: encodedData2,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await deresyAttestations.deresyAttestation(attestation2, { from: reviewerAddress2, value: 0 })

      let request = await deresyAttestations.getRequest(requestName)
      assert.equal(request.reviews.length, 2)

      let reviewableRequest = await onReviewableExample.getRequestReviews(requestName)
      assert.equal(reviewableRequest.attestations.length, 2)
      assert.equal(reviewableRequest.attestations[0].uid, attestationUID1)
      assert.equal(reviewableRequest.attestations[1].uid, attestationUID2)
    })
  })

  it("should NOT trigger the onReview callback in onReviewableExample contract when review is created if callback contract is not set", async () => {
    let questionsArray = ["Q1", "Q2"]
    let questionTypesArray = [2, 1]
    let choicesArray = [["choice1", "choice2"], []]
    const reviewFormName = "ORERF2"
    await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

    const requestName = "ORE2"
    let reviewersArray = [reviewerAddress1, reviewerAddress2]
    let hypercertsArray = [hypercertID1, hypercertID2]
    let hypercertsIPFSHashes = ["hash1", "hash2"]
    let ipfsHash = "hash"
    
    await deresyAttestations.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })

    let answersArray = ["choice1", "Yes"]
    const abi = [
      { type: 'string', name: 'requestName' },
      { type: 'uint256', name: 'hypercertID' },
      { type: 'string[]', name: 'answers' },
      { type: 'string', name: 'pdfIpfsHash' },
      { type: 'string[]', name: 'attachmentsIpfsHashes' },
    ];
    
    const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, "pdfIpfsHash", []]);
    const attestation1 = {
      uid: attestationUID1,
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
    await deresyAttestations.deresyAttestation(attestation1, { from: reviewerAddress2, value: 0 })

    let request = await deresyAttestations.getRequest(requestName)
    assert.equal(request.reviews.length, 1)

    let reviewableRequest = await onReviewableExample.getRequestReviews(requestName)
    assert.equal(reviewableRequest.attestations.length, 0)
  })

  it("should trigger the onReview function in onReviewableExample contract when review is created", async () => {
    await deresyAttestations.setCallbackContract(onReviewableExample.address, { from: ownerAddress })

    let questionsArray = ["Q1", "Q2"]
    let questionTypesArray = [2, 1]
    let choicesArray = [["choice1", "choice2"], []]
    const reviewFormName = "ORERF3"
    await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

    const requestName = "ORE3"
    let reviewersArray = [reviewerAddress1, reviewerAddress2]
    let hypercertsArray = [hypercertID1, hypercertID2]
    let hypercertsIPFSHashes = ["hash1", "hash2"]
    let ipfsHash = "hash"
    
    await deresyAttestations.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })

    let answersArray = ["choice1", "Yes"]
    const abi = [
      { type: 'string', name: 'requestName' },
      { type: 'uint256', name: 'hypercertID' },
      { type: 'string[]', name: 'answers' },
      { type: 'string', name: 'pdfIpfsHash' },
      { type: 'string[]', name: 'attachmentsIpfsHashes' },
    ];
    
    const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, "pdfIpfsHash", []]);
    const attestation1 = {
      uid: attestationUID1,
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
    truffleAssert.eventEmitted(await deresyAttestations.deresyAttestation(attestation1, { from: reviewerAddress2, value: 0 }), 'OnReviewCallback', (ev) => { return ev._requestName == requestName && ev._attestation.uid == attestation1.uid });
  })

  it("should NOT trigger the onReview function in onReviewableExample contract when review is NOT created", async () => {
    await deresyAttestations.setCallbackContract(onReviewableExample.address, { from: ownerAddress })

    let questionsArray = ["Q1", "Q2"]
    let questionTypesArray = [2, 1]
    let choicesArray = [["choice1", "choice2"], []]
    const reviewFormName = "ORERF4"
    await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
    

    const requestName = "ORE4"
    let reviewersArray = [reviewerAddress1, reviewerAddress2]
    let hypercertsArray = [hypercertID1, hypercertID2]
    let hypercertsIPFSHashes = ["hash1", "hash2"]
    let ipfsHash = "hash"
    
    await deresyAttestations.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })

    let answersArray = ["choice1", ""]
    const abi = [
      { type: 'string', name: 'requestName' },
      { type: 'uint256', name: 'hypercertID' },
      { type: 'string[]', name: 'answers' },
      { type: 'string', name: 'pdfIpfsHash' },
      { type: 'string[]', name: 'attachmentsIpfsHashes' },
    ];
    
    const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, "pdfIpfsHash", []]);
    const attestation1 = {
      uid: attestationUID1,
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
    truffleAssert.eventNotEmitted(await deresyAttestations.deresyAttestation(attestation1, { from: reviewerAddress2, value: 0 }), 'OnReviewCallback');
  })

  it("should NOT trigger the onReview function in onReviewableExample contract when callback contract is NOT set", async () => {
    await deresyAttestations.setCallbackContract("0x0000000000000000000000000000000000000000", { from: ownerAddress })

    let questionsArray = ["Q1", "Q2"]
    let questionTypesArray = [2, 1]
    let choicesArray = [["choice1", "choice2"], []]
    const reviewFormName = "ORERF5"
    await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
    

    const requestName = "ORE5"
    let reviewersArray = [reviewerAddress1, reviewerAddress2]
    let hypercertsArray = [hypercertID1, hypercertID2]
    let hypercertsIPFSHashes = ["hash1", "hash2"]
    let ipfsHash = "hash"

    await deresyAttestations.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })

    let answersArray = ["choice1", "Yes"]
    const abi = [
      { type: 'string', name: 'requestName' },
      { type: 'uint256', name: 'hypercertID' },
      { type: 'string[]', name: 'answers' },
      { type: 'string', name: 'pdfIpfsHash' },
      { type: 'string[]', name: 'attachmentsIpfsHashes' },
    ];
    
    const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, "pdfIpfsHash", []]);
    const attestation1 = {
      uid: attestationUID1,
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
    truffleAssert.eventNotEmitted(await deresyAttestations.deresyAttestation(attestation1, { from: reviewerAddress2, value: 0 }), 'OnReviewCallback');
  })
})