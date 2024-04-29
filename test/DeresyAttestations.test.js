const DeresyAttestations = artifacts.require('DeresyAttestations')
const DeresyERC721MockToken = artifacts.require("DeresyERC721MockToken")
const truffleAssert = require("truffle-assertions")
const { assert } = require('chai')
const BN = require("bn.js")

function toBN(number) {
  return new BN(number)
}

contract('DeresyAttestations', (accounts) => {
  // Start testing variables ----------
  const ownerAddress = accounts[0] // Address that deployed the contract
  const reviewerAddress1 = accounts[1]    
  const reviewerAddress2 = accounts[2]
  const reviewerAddress3 = accounts[3]
  const erc721TokenOwner = accounts[4]
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const hypercertID1 = toBN("10000218199072539564261652963204804198268928");
  const hypercertID2 = toBN("10000558481439460502725116337812235966480384");
  const rewardPerReview1 = "10000000000000000"
  const easContractAddress = "0x4200000000000000000000000000000000000021"
  const attestationUID ="0x0000000000000000000000000000000000000000000000000000000000000001"
  const attestationUID2 ="0x0000000000000000000000000000000000000000000000000000000000000002"
  const attestationUID3 ="0x0000000000000000000000000000000000000000000000000000000000000005"
  const reviewsSchemaUID = "0x0000000000000000000000000000000000000000000000000000000000000003"
  const invalidReviewsSchemaUID = "0x0000000000000000000000000000000000000000000000000000000000000004"
  const amendmentsSchemaUID = "0x0000000000000000000000000000000000000000000000000000000000000004"
  const amendmentAttestationUID1 ="0x0000000000000000000000000000000000000000000000000000000000000010"
  const amendmentAttestationUID2 ="0x0000000000000000000000000000000000000000000000000000000000000011"
  const amendmentAttestationUID3 ="0x0000000000000000000000000000000000000000000000000000000000000012"
  const amendmentAttestationUID4 ="0x0000000000000000000000000000000000000000000000000000000000000013"
  const amendmentAttestationUID5 ="0x0000000000000000000000000000000000000000000000000000000000000014"
  // End testing variables ----------
  let deresyAttestations
  let deresyERC721MockToken
  // Load contract
  before(async ()=> {            
    deresyAttestations = await DeresyAttestations.new(easContractAddress)
    await deresyAttestations.unpause()
    await deresyAttestations.setValidateHypercertIDs(false)
    await deresyAttestations.setReviewsSchemaID(reviewsSchemaUID, { from: ownerAddress })
    await deresyAttestations.setAmendmentsSchemaID(amendmentsSchemaUID, { from: ownerAddress })
    deresyERC721MockToken = await DeresyERC721MockToken.new()
    await deresyERC721MockToken.mint(erc721TokenOwner, web3.utils.toWei("100", "ether"));
  })

  // onAttest ----------
  describe('Reviews Attestations with reviewers addresses', async () => {
    it("should create reviews if data is correct and emit the corresponding events", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF1"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRS1"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      
      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      for (let i = 0; i < reviewersArray.length; i++) {
        for (let j = 0; j < hypercertsArray.length; j++) {
          let answersArray = ["choice1", "Yes"]
          const abi = [
            { type: 'string', name: 'requestName' },
            { type: 'uint256', name: 'hypercertID' },
            { type: 'string[]', name: 'answers' },
            { type: 'string[]', name: 'questions' },
            { type: 'string[]', name: 'questionTypes' },
            { type: 'string', name: 'pdfIpfsHash' },
            { type: 'string[]', name: 'attachmentsIpfsHashes' },
          ];
          
          const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertsArray[j], answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", ["a1", "a2"]]);
          const attestation = {
            uid: attestationUID,
            schema: reviewsSchemaUID,
            attester: reviewersArray[i],
            data: encodedData,
            time: 1695111673n, 
            expirationTime: 0n,
            revocationTime: 0n,
            refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
            recipient: "0x0000000000000000000000000000000000000000",
            revocable: false 
          };
          
          truffleAssert.eventEmitted(await deresyAttestations.deresyAttestation(attestation, { from: reviewersArray[i], value: 0 }), 'SubmittedReview', (ev) => { return ev._requestName == requestName });
        }
      }

      let request = await deresyAttestations.getRequest(requestName)
      assert.equal(request.reviews.length, hypercertsArray.length * reviewersArray.length)
      const expectedReviews = [
        [
          reviewerAddress1,
          hypercertID1.toString(),
          attestationUID,
          []
        ],
        [
          reviewerAddress1,
          hypercertID2.toString(),
          attestationUID,
          []
        ],
        [
          reviewerAddress2,
          hypercertID1.toString(),
          attestationUID,
          []
        ],
        [
          reviewerAddress2,
          hypercertID2.toString(),
          attestationUID,
          []
        ],
        [
          reviewerAddress3,
          hypercertID1.toString(),
          attestationUID,
          []
        ],
        [
          reviewerAddress3,
          hypercertID2.toString(),
          attestationUID,
          []
        ],
      ]
      assert.deepEqual(request.reviews, expectedReviews)
    })

    it("should create reviews if data is correct for free requests and emit the corresponding events", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF2"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRS1Free"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"

      await deresyAttestations.createNonPayableRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, reviewFormName, { from: ownerAddress })
      
      for (let i = 0; i < reviewersArray.length; i++) {
        for (let j = 0; j < hypercertsArray.length; j++) {
          let answersArray = ["choice1", "Yes"]
          const abi = [
            { type: 'string', name: 'requestName' },
            { type: 'uint256', name: 'hypercertID' },
            { type: 'string[]', name: 'answers' },
            { type: 'string[]', name: 'questions' },
            { type: 'string[]', name: 'questionTypes' },
            { type: 'string', name: 'pdfIpfsHash' },
            { type: 'string[]', name: 'attachmentsIpfsHashes' },
          ];
          
          const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertsArray[j], answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
          const attestation = {
            uid: attestationUID,
            schema: reviewsSchemaUID,
            attester: reviewersArray[i],
            data: encodedData,
            time: 1695111673n, 
            expirationTime: 0n,
            revocationTime: 0n,
            refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
            recipient: "0x0000000000000000000000000000000000000000",
            revocable: false 
          };
          
          truffleAssert.eventEmitted(await deresyAttestations.deresyAttestation(attestation, { from: reviewersArray[i], value: 0 }), 'SubmittedReview', (ev) => { return ev._requestName == requestName });
          
        }
      }

      let request = await deresyAttestations.getRequest(requestName)
      assert.equal(request.reviews.length, hypercertsArray.length * reviewersArray.length)
      const expectedReviews = [
        [
          reviewerAddress1,
          hypercertID1.toString(),
          attestationUID,
          []
        ],
        [
          reviewerAddress1,
          hypercertID2.toString(),
          attestationUID,
          []
        ],
        [
          reviewerAddress2,
          hypercertID1.toString(),
          attestationUID,
          []
        ],
        [
          reviewerAddress2,
          hypercertID2.toString(),
          attestationUID,
          []
        ],
        [
          reviewerAddress3,
          hypercertID1.toString(),
          attestationUID,
          []
        ],
        [
          reviewerAddress3,
          hypercertID2.toString(),
          attestationUID,
          []
        ],
      ]
      assert.deepEqual(request.reviews, expectedReviews)
    })

    it("should not create reviews if attester atttests 2 times for the same hypercertID", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF3"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRS2"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"

      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      
      const encodedDataH1 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestationH1 = {
        uid: attestationUID,
        schema: reviewsSchemaUID,
        attester: reviewerAddress1,
        data: encodedDataH1,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false 
      };

      const encodedDataH2 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID2, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestationH2 = {
        uid: attestationUID,
        schema: reviewsSchemaUID,
        attester: reviewerAddress1,
        data: encodedDataH2,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };

      truffleAssert.eventEmitted(await deresyAttestations.deresyAttestation(attestationH1, { from: reviewerAddress1, value: 0 }), 'SubmittedReview', (ev) => { return ev._requestName == requestName });
      truffleAssert.eventEmitted(await deresyAttestations.deresyAttestation(attestationH2, { from: reviewerAddress2, value: 0 }), 'SubmittedReview', (ev) => { return ev._requestName == requestName });
      truffleAssert.eventNotEmitted(await deresyAttestations.deresyAttestation(attestationH1, { from: reviewerAddress1, value: 0 }), 'SubmittedReview')

      let request = await deresyAttestations.getRequest(requestName)
      assert.equal(request.reviews.length, 2)
    })

    it("should not create review if attester is not a reviewer", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF4"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRS3"
      let reviewersArray = [reviewerAddress1, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"

      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      
      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
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

      truffleAssert.eventNotEmitted(await deresyAttestations.deresyAttestation(attestation, { from: reviewerAddress2, value: 0 }), 'SubmittedReview')

      let request = await deresyAttestations.getRequest(requestName)
      assert.equal(request.reviews.length, 0)
    })

    it("should not create review if easSchemaID is not a valid", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF5"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRS3-1"
      let reviewersArray = [reviewerAddress1, reviewerAddress3]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      
      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      
      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestation = {
        uid: attestationUID,
        schema: invalidReviewsSchemaUID,
        attester: reviewerAddress1,
        data: encodedData,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await deresyAttestations.deresyAttestation(attestation, { from: reviewerAddress1, value: 0 })
      let request = await deresyAttestations.getRequest(requestName)
      assert.equal(request.reviews.length, 0)
    })

    it("should not create reviews if review request is closed", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF6"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRS4"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"

      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      await deresyAttestations.closeReviewRequest(requestName, { from: ownerAddress, value: 0 })

      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      
      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
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

      truffleAssert.eventNotEmitted(await deresyAttestations.deresyAttestation(attestation, { from: reviewerAddress2, value: 0 }), 'SubmittedReview')

      let request = await deresyAttestations.getRequest(requestName)
      assert.equal(request.reviews.length, 0)
    })

    it("should not create review if hypercertID is not in reviewRequest hypercertIDs array", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF7"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRS5"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1]
      let hypercertsIPFSHashes = ["hash1"]
      let ipfsHash = "hash"

      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })

      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      
      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID2, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
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

      truffleAssert.eventNotEmitted(await deresyAttestations.deresyAttestation(attestation, { from: reviewerAddress2, value: 0 }), 'SubmittedReview')

      let request = await deresyAttestations.getRequest(requestName)
      assert.equal(request.reviews.length, 0)
    })
    
    it("should not create review if answersArray length is different from review form questionsArray", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF8"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRS6"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      
      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })

      let answersArray = ["choice1", "Yes", "invalidAnswer1", "invalidAnswer2"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      
      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
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

      truffleAssert.eventNotEmitted(await deresyAttestations.deresyAttestation(attestation, { from: reviewerAddress2, value: 0 }), 'SubmittedReview')

      let request = await deresyAttestations.getRequest(requestName)
      assert.equal(request.reviews.length, 0)
    })

    it("should not create reviews if singleChoice answers do not pass validation", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF9"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRS7"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"

      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })

      let answersArray = ["invalidAnswer", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      
      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
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

      truffleAssert.eventNotEmitted(await deresyAttestations.deresyAttestation(attestation, { from: reviewerAddress2, value: 0 }), 'SubmittedReview')

      let request = await deresyAttestations.getRequest(requestName)
      assert.equal(request.reviews.length, 0)
    })

    it("should not create reviews if checkbox type answers do not pass validation", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF10"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRS8"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"

      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })

      let answersArray = ["choice1", "invalidAnswer"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      
      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
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

      truffleAssert.eventNotEmitted(await deresyAttestations.deresyAttestation(attestation, { from: reviewerAddress2, value: 0 }), 'SubmittedReview')

      let request = await deresyAttestations.getRequest(requestName)
      assert.equal(request.reviews.length, 0)
    })

    it("should not create reviews if text answers do not pass validation", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 0]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF11"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRS9"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      
      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })

      let answersArray = ["choice1", ""]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      
      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
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

      truffleAssert.eventNotEmitted(await deresyAttestations.deresyAttestation(attestation, { from: reviewerAddress2, value: 0 }), 'SubmittedReview')

      let request = await deresyAttestations.getRequest(requestName)
      assert.equal(request.reviews.length, 0)
    })

    it("should transfer funds to reviewer if attestation is valid", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF12"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRS10"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      
      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      
      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
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
      
      const reviewerAddress2BalanceBefore = await web3.eth.getBalance(reviewerAddress2);
      const tx = await deresyAttestations.deresyAttestation(attestation, { from: reviewerAddress2, value: 0 })
      const gasEstimate = await web3.eth.getTransactionReceipt(tx.tx)
      let request = await deresyAttestations.getRequest(requestName)
      assert.equal(request.reviews.length, 1)
      const reviewerAddress2BalanceAfter = await web3.eth.getBalance(reviewerAddress2)
      const reviewerAddress2ExpectedBalance = BigInt(reviewerAddress2BalanceBefore) + BigInt(rewardPerReview1) - BigInt(gasEstimate.gasUsed*gasEstimate.effectiveGasPrice)
      assert.equal(reviewerAddress2ExpectedBalance, reviewerAddress2BalanceAfter)
    })

    it("should revert the review submission if contract is paused", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF13"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRS11-PAUSE"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      
      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      
      await deresyAttestations.pause({ from: ownerAddress });

      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
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

      await truffleAssert.reverts(
        deresyAttestations.deresyAttestation(attestation, { from: reviewerAddress2, value: 0 }), 
        "Contract is paused"
      );
    })
  })

  describe('Reviews Attestations with reviewer contract', async () => {
    it("should create reviews if data is correct and emit the corresponding events for payable requests", async () => {
      await deresyAttestations.unpause({ from: ownerAddress });
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF1-RC1"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRS1-RC1"
      let reviewersArray = []
      let reviewersContracts = [deresyERC721MockToken.address]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      
      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersContracts.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersContracts.length * hypercertsArray.length })
      
      for (let j = 0; j < hypercertsArray.length; j++) {
        let answersArray = ["choice1", "Yes"]
        const abi = [
          { type: 'string', name: 'requestName' },
          { type: 'uint256', name: 'hypercertID' },
          { type: 'string[]', name: 'answers' },
          { type: 'string[]', name: 'questions' },
          { type: 'string[]', name: 'questionTypes' },
          { type: 'string', name: 'pdfIpfsHash' },
          { type: 'string[]', name: 'attachmentsIpfsHashes' },
        ];
        
        const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertsArray[j], answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", ["a1", "a2"]]);
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
        
        truffleAssert.eventEmitted(await deresyAttestations.deresyAttestation(attestation, { from: erc721TokenOwner, value: 0 }), 'SubmittedReview', (ev) => { return ev._requestName == requestName });
      }

      let request = await deresyAttestations.getRequest(requestName)
      assert.equal(request.reviews.length, hypercertsArray.length)
      const expectedReviews = [
        [
          erc721TokenOwner,
          hypercertID1.toString(),
          attestationUID,
          []
        ],
        [
          erc721TokenOwner,
          hypercertID2.toString(),
          attestationUID,
          []
        ]
      ]
      assert.deepEqual(request.reviews, expectedReviews)
    })

    it("should create reviews if data is correct for free requests and emit the corresponding events for non-payable requests", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF2-RC2"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRS1Free-RC2"
      let reviewersArray = []
      let reviewersContracts = [deresyERC721MockToken.address]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"

      await deresyAttestations.createNonPayableRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, reviewFormName, { from: ownerAddress })
      
      for (let j = 0; j < hypercertsArray.length; j++) {
        let answersArray = ["choice1", "Yes"]
        const abi = [
          { type: 'string', name: 'requestName' },
          { type: 'uint256', name: 'hypercertID' },
          { type: 'string[]', name: 'answers' },
          { type: 'string[]', name: 'questions' },
          { type: 'string[]', name: 'questionTypes' },
          { type: 'string', name: 'pdfIpfsHash' },
          { type: 'string[]', name: 'attachmentsIpfsHashes' },
        ];
        
        const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertsArray[j], answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
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
        
        truffleAssert.eventEmitted(await deresyAttestations.deresyAttestation(attestation, { from: erc721TokenOwner, value: 0 }), 'SubmittedReview', (ev) => { return ev._requestName == requestName }); 
      }

      let request = await deresyAttestations.getRequest(requestName)
      assert.equal(request.reviews.length, hypercertsArray.length)
      const expectedReviews = [
        [
          erc721TokenOwner,
          hypercertID1.toString(),
          attestationUID,
          []
        ],
        [
          erc721TokenOwner,
          hypercertID2.toString(),
          attestationUID,
          []
        ],
      ]
      assert.deepEqual(request.reviews, expectedReviews)
    })

    it("should not create reviews if same attester atttests 2 times for the same hypercertID", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF3-RC3"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRS2-RC3"
      let reviewersArray = []
      let reviewersContracts = [deresyERC721MockToken.address]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      const reviewsPerHypercert = 4

      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewsPerHypercert, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewsPerHypercert * hypercertsArray.length })
      
      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      
      const encodedDataH1 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestationH1 = {
        uid: attestationUID,
        schema: reviewsSchemaUID,
        attester: erc721TokenOwner,
        data: encodedDataH1,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false 
      };

      const encodedDataH2 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestationH2 = {
        uid: attestationUID,
        schema: reviewsSchemaUID,
        attester: erc721TokenOwner,
        data: encodedDataH2,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };

      truffleAssert.eventEmitted(await deresyAttestations.deresyAttestation(attestationH1, { from: erc721TokenOwner, value: 0 }), 'SubmittedReview', (ev) => { return ev._requestName == requestName });
      truffleAssert.eventNotEmitted(await deresyAttestations.deresyAttestation(attestationH2, { from: erc721TokenOwner, value: 0 }), 'SubmittedReview')

      let request = await deresyAttestations.getRequest(requestName)
      assert.equal(request.reviews.length, 1)
    })

    it("should not create review if attester is not a reviewer", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF4-RC4"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRS3-RC4"
      let reviewersArray = []
      let reviewersContracts = [deresyERC721MockToken.address]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"

      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersContracts.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersContracts.length * hypercertsArray.length })
      
      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      
      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
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

      truffleAssert.eventNotEmitted(await deresyAttestations.deresyAttestation(attestation, { from: reviewerAddress2, value: 0 }), 'SubmittedReview')

      let request = await deresyAttestations.getRequest(requestName)
      assert.equal(request.reviews.length, 0)
    })

    it("should transfer funds to reviewer if attestation is valid", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF12-RC5"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRS10-RC5"
      let reviewersArray = []
      let reviewersContracts = [deresyERC721MockToken.address]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      
      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersContracts.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersContracts.length * hypercertsArray.length })
      
      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      
      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
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
      
      const erc721TokenOwnerBalanceBefore = await web3.eth.getBalance(erc721TokenOwner);
      const tx = await deresyAttestations.deresyAttestation(attestation, { from: erc721TokenOwner, value: 0 })
      const gasEstimate = await web3.eth.getTransactionReceipt(tx.tx)
      let request = await deresyAttestations.getRequest(requestName)
      assert.equal(request.reviews.length, 1)
      const erc721TokenOwnerBalanceAfter = await web3.eth.getBalance(erc721TokenOwner)
      const erc721TokenOwnerExpectedBalance = BigInt(erc721TokenOwnerBalanceBefore) + BigInt(rewardPerReview1) - BigInt(gasEstimate.gasUsed*gasEstimate.effectiveGasPrice)
      assert.equal(erc721TokenOwnerExpectedBalance, erc721TokenOwnerBalanceAfter)
    })

    it("should allow submit reviews for attesters in reviewers array and owners of reviewers contracts tokens", async () => {
      await deresyAttestations.unpause({ from: ownerAddress });
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF1-RPH3"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRS1-RPH3"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = [deresyERC721MockToken.address]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      const reviewsPerHypercert = 4
      
      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewsPerHypercert, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewsPerHypercert * hypercertsArray.length })
      
      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      
      const encodedDataH1 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestationH1 = {
        uid: attestationUID,
        schema: reviewsSchemaUID,
        attester: erc721TokenOwner,
        data: encodedDataH1,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false 
      };

      const encodedDataH2 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestationH2 = {
        uid: attestationUID,
        schema: reviewsSchemaUID,
        attester: reviewerAddress1,
        data: encodedDataH2,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };

      const encodedDataH3 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestationH3 = {
        uid: attestationUID,
        schema: reviewsSchemaUID,
        attester: reviewerAddress2,
        data: encodedDataH3,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };

      const encodedDataH4 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestationH4 = {
        uid: attestationUID,
        schema: reviewsSchemaUID,
        attester: reviewerAddress3,
        data: encodedDataH4,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };

      await truffleAssert.passes(deresyAttestations.deresyAttestation(attestationH1, { from: erc721TokenOwner, value: 0 }));
      await truffleAssert.passes(deresyAttestations.deresyAttestation(attestationH2, { from: reviewerAddress1, value: 0 }));
      await truffleAssert.passes(deresyAttestations.deresyAttestation(attestationH3, { from: reviewerAddress2, value: 0 }));
      await truffleAssert.passes(deresyAttestations.deresyAttestation(attestationH4, { from: reviewerAddress3, value: 0 }));

      let request = await deresyAttestations.getRequest(requestName)
      assert.equal(request.reviews.length, reviewsPerHypercert)
    })

    it("should revert if reviewsPerHypercert value is exceeded", async () => {
      await deresyAttestations.unpause({ from: ownerAddress });
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF1-RPH"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "RRS1-RPH"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let reviewersContracts = [deresyERC721MockToken.address]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      const reviewsPerHypercert = 3 
      
      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewsPerHypercert, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewsPerHypercert * hypercertsArray.length })
      
      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      
      const encodedDataH1 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestationH1 = {
        uid: attestationUID,
        schema: reviewsSchemaUID,
        attester: erc721TokenOwner,
        data: encodedDataH1,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false 
      };

      const encodedDataH2 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestationH2 = {
        uid: attestationUID,
        schema: reviewsSchemaUID,
        attester: reviewerAddress1,
        data: encodedDataH2,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };

      const encodedDataH3 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestationH3 = {
        uid: attestationUID,
        schema: reviewsSchemaUID,
        attester: reviewerAddress2,
        data: encodedDataH3,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };

      const encodedDataH4 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestationH4 = {
        uid: attestationUID,
        schema: reviewsSchemaUID,
        attester: reviewerAddress3,
        data: encodedDataH4,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(attestationH1, { from: erc721TokenOwner, value: 0 }));
      await truffleAssert.passes(deresyAttestations.deresyAttestation(attestationH2, { from: reviewerAddress1, value: 0 }));
      await truffleAssert.passes(deresyAttestations.deresyAttestation(attestationH3, { from: reviewerAddress2, value: 0 }));
      await truffleAssert.reverts(deresyAttestations.deresyAttestation(attestationH4, { from: reviewerAddress3, value: 0 }), "Deresy: Max reviews per hypercert exceeded");
    })
  })

  describe('Amendments Attestations', async () => {
    it("should create amendments if attestation data is valid", async () => {
      await deresyAttestations.unpause({ from: ownerAddress });
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF14"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "AA1"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      
      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];

      const encodedData1 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestation1 = {
        uid: attestationUID,
        schema: reviewsSchemaUID,
        attester: reviewerAddress1,
        data: encodedData1,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(attestation1, { from: reviewerAddress1, value: 0 }));

      const encodedData2 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID2, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestation2 = {
        uid: attestationUID2,
        schema: reviewsSchemaUID,
        attester: reviewerAddress1,
        data: encodedData2,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(attestation2, { from: reviewerAddress1, value: 0 }));

      const encodedData3 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestation3 = {
        uid: attestationUID3,
        schema: reviewsSchemaUID,
        attester: reviewerAddress2,
        data: encodedData3,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(attestation3, { from: reviewerAddress2, value: 0 }));


      let request = await deresyAttestations.getRequest(requestName)
      let expectedReviews = [
        [
          reviewerAddress1,
          hypercertID1.toString(),
          attestationUID,
          []
        ],
        [
          reviewerAddress1,
          hypercertID2.toString(),
          attestationUID2,
          []
        ],
        [
          reviewerAddress2,
          hypercertID1.toString(),
          attestationUID3,
          []
        ],
      ]
      assert.deepEqual(request.reviews, expectedReviews)

      const amendmentAbi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string', name: 'amendment' },
        { type: 'string', name: 'ipfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      const amendmentEncodedData = web3.eth.abi.encodeParameters(amendmentAbi, [requestName, hypercertID1, "amendment text", "pdfIpfsHash", []]);
      const amendmentAttestation = {
        uid: amendmentAttestationUID1,
        schema: amendmentsSchemaUID,
        attester: reviewerAddress1,
        data: amendmentEncodedData,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: attestationUID,
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(amendmentAttestation, { from: reviewerAddress1, value: 0 }));

      const amendmentEncodedData2 = web3.eth.abi.encodeParameters(amendmentAbi, [requestName, hypercertID2, "amendment text", "pdfIpfsHash", []]);
      const amendmentAttestation2 = {
        uid: amendmentAttestationUID2,
        schema: amendmentsSchemaUID,
        attester: reviewerAddress1,
        data: amendmentEncodedData2,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: attestationUID2,
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(amendmentAttestation2, { from: reviewerAddress1, value: 0 }));

      const amendmentEncodedData3 = web3.eth.abi.encodeParameters(amendmentAbi, [requestName, hypercertID1, "amendment text", "pdfIpfsHash", []]);
      const amendmentAttestation3 = {
        uid: amendmentAttestationUID3,
        schema: amendmentsSchemaUID,
        attester: reviewerAddress2,
        data: amendmentEncodedData3,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: attestationUID3,
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(amendmentAttestation3, { from: reviewerAddress2, value: 0 }));

      const amendmentEncodedData4 = web3.eth.abi.encodeParameters(amendmentAbi, [requestName, hypercertID1, "amendment text", "pdfIpfsHash", []]);
      const amendmentAttestation4 = {
        uid: amendmentAttestationUID4,
        schema: amendmentsSchemaUID,
        attester: reviewerAddress1,
        data: amendmentEncodedData4,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: attestationUID,
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(amendmentAttestation4, { from: reviewerAddress1, value: 0 }));

      const amendmentEncodedData5 = web3.eth.abi.encodeParameters(amendmentAbi, [requestName, hypercertID1, "amendment text", "pdfIpfsHash", []]);
      const amendmentAttestation5 = {
        uid: amendmentAttestationUID5,
        schema: amendmentsSchemaUID,
        attester: reviewerAddress1,
        data: amendmentEncodedData5,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: attestationUID,
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(amendmentAttestation5, { from: reviewerAddress1, value: 0 }));

      request = await deresyAttestations.getRequest(requestName)
      expectedReviews = [
        [
          reviewerAddress1,
          hypercertID1.toString(),
          attestationUID,
          [amendmentAttestationUID1, amendmentAttestationUID4, amendmentAttestationUID5]
        ],
        [
          reviewerAddress1,
          hypercertID2.toString(),
          attestationUID2,
          [amendmentAttestationUID2]
        ],
        [
          reviewerAddress2,
          hypercertID1.toString(),
          attestationUID3,
          [amendmentAttestationUID3]
        ],
      ]
      assert.deepEqual(request.reviews, expectedReviews)
    })

    it("should not create amendments if refUID does not point to an existing review", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF15"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "AA2"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      
      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];

      const encodedData1 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestation1 = {
        uid: attestationUID,
        schema: reviewsSchemaUID,
        attester: reviewerAddress1,
        data: encodedData1,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(attestation1, { from: reviewerAddress1, value: 0 }));

      let request = await deresyAttestations.getRequest(requestName)
      let expectedReviews = [
        [
          reviewerAddress1,
          hypercertID1.toString(),
          attestationUID,
          []
        ],
      ]
      assert.deepEqual(request.reviews, expectedReviews)

      const amendmentAbi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string', name: 'amendment' },
        { type: 'string', name: 'ipfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      const amendmentEncodedData = web3.eth.abi.encodeParameters(amendmentAbi, [requestName, hypercertID1, "amendment text", "pdfIpfsHash", []]);
      const amendmentAttestation = {
        uid: amendmentAttestationUID1,
        schema: amendmentsSchemaUID,
        attester: reviewerAddress1,
        data: amendmentEncodedData,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: attestationUID2,
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(amendmentAttestation, { from: reviewerAddress1, value: 0 }));

      request = await deresyAttestations.getRequest(requestName)
      expectedReviews = [
        [
          reviewerAddress1,
          hypercertID1.toString(),
          attestationUID,
          []
        ],
      ]
      assert.deepEqual(request.reviews, expectedReviews)
    })

    it("should not create amendments if request has no reviews", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF16"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "AA3"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      
      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })

      let request = await deresyAttestations.getRequest(requestName)
      let expectedReviews = []
      assert.deepEqual(request.reviews, expectedReviews)

      const amendmentAbi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string', name: 'amendment' },
        { type: 'string', name: 'ipfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      const amendmentEncodedData = web3.eth.abi.encodeParameters(amendmentAbi, [requestName, hypercertID1, "amendment text", "pdfIpfsHash", []]);
      const amendmentAttestation = {
        uid: amendmentAttestationUID1,
        schema: amendmentsSchemaUID,
        attester: reviewerAddress1,
        data: amendmentEncodedData,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: attestationUID,
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(amendmentAttestation, { from: reviewerAddress1, value: 0 }));

      request = await deresyAttestations.getRequest(requestName)
      expectedReviews = []
      assert.deepEqual(request.reviews, expectedReviews)
    })

    it("should not create amendments if reviewer is not attester", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF17"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "AA4"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      
      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];

      const encodedData1 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestation1 = {
        uid: attestationUID,
        schema: reviewsSchemaUID,
        attester: reviewerAddress1,
        data: encodedData1,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(attestation1, { from: reviewerAddress1, value: 0 }));

      let request = await deresyAttestations.getRequest(requestName)
      let expectedReviews = [
        [
          reviewerAddress1,
          hypercertID1.toString(),
          attestationUID,
          []
        ],
      ]
      assert.deepEqual(request.reviews, expectedReviews)

      const amendmentAbi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string', name: 'amendment' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      const amendmentEncodedData = web3.eth.abi.encodeParameters(amendmentAbi, [requestName, hypercertID1, "amendment text", "pdfIpfsHash", []]);
      const amendmentAttestation = {
        uid: amendmentAttestationUID1,
        schema: amendmentsSchemaUID,
        attester: reviewerAddress2,
        data: amendmentEncodedData,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: attestationUID,
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(amendmentAttestation, { from: reviewerAddress2, value: 0 }));

      request = await deresyAttestations.getRequest(requestName)
      expectedReviews = [
        [
          reviewerAddress1,
          hypercertID1.toString(),
          attestationUID,
          []
        ],
      ]
      assert.deepEqual(request.reviews, expectedReviews)
    })

    it("should not create amendments if amendment text is empty", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF18"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "AA5"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      
      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];

      const encodedData1 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestation1 = {
        uid: attestationUID,
        schema: reviewsSchemaUID,
        attester: reviewerAddress1,
        data: encodedData1,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(attestation1, { from: reviewerAddress1, value: 0 }));

      let request = await deresyAttestations.getRequest(requestName)
      let expectedReviews = [
        [
          reviewerAddress1,
          hypercertID1.toString(),
          attestationUID,
          []
        ],
      ]
      assert.deepEqual(request.reviews, expectedReviews)

      const amendmentAbi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string', name: 'amendment' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      const amendmentEncodedData = web3.eth.abi.encodeParameters(amendmentAbi, [requestName, hypercertID1, "", "pdfIpfsHash", []]);
      const amendmentAttestation = {
        uid: amendmentAttestationUID1,
        schema: amendmentsSchemaUID,
        attester: reviewerAddress1,
        data: amendmentEncodedData,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: attestationUID,
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(amendmentAttestation, { from: reviewerAddress1, value: 0 }));

      request = await deresyAttestations.getRequest(requestName)
      expectedReviews = [
        [
          reviewerAddress1,
          hypercertID1.toString(),
          attestationUID,
          []
        ],
      ]
      assert.deepEqual(request.reviews, expectedReviews)
    })

    it("should not create amendments if amendment attestation ID is already in the review amendments UID array", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF19"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "AA6"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      
      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];

      const encodedData1 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestation1 = {
        uid: attestationUID,
        schema: reviewsSchemaUID,
        attester: reviewerAddress1,
        data: encodedData1,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(attestation1, { from: reviewerAddress1, value: 0 }));

      let request = await deresyAttestations.getRequest(requestName)
      let expectedReviews = [
        [
          reviewerAddress1,
          hypercertID1.toString(),
          attestationUID,
          []
        ],
      ]
      assert.deepEqual(request.reviews, expectedReviews)

      const amendmentAbi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string', name: 'amendment' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      const amendmentEncodedData = web3.eth.abi.encodeParameters(amendmentAbi, [requestName, hypercertID1, "amendment text", "pdfIpfsHash", []]);
      const amendmentAttestation = {
        uid: amendmentAttestationUID1,
        schema: amendmentsSchemaUID,
        attester: reviewerAddress1,
        data: amendmentEncodedData,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: attestationUID,
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(amendmentAttestation, { from: reviewerAddress1, value: 0 }));
      //Repeating the same amendment attestation UID should fail
      const amendmentEncodedData2 = web3.eth.abi.encodeParameters(amendmentAbi, [requestName, hypercertID1, "amendment text", "pdfIpfsHash", []]);
      const amendmentAttestation2 = {
        uid: amendmentAttestationUID1,
        schema: amendmentsSchemaUID,
        attester: reviewerAddress1,
        data: amendmentEncodedData2,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: attestationUID,
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(amendmentAttestation2, { from: reviewerAddress1, value: 0 }));

      request = await deresyAttestations.getRequest(requestName)
      expectedReviews = [
        [
          reviewerAddress1,
          hypercertID1.toString(),
          attestationUID,
          [amendmentAttestationUID1]
        ],
      ]
      assert.deepEqual(request.reviews, expectedReviews)
    })

    it("should not create amendments if amendment hypercertID does not match the review hypercertID", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF19a"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "AA7"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1]
      let hypercertsIPFSHashes = ["hash1"]
      let ipfsHash = "hash"
      
      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];

      const encodedData1 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestation1 = {
        uid: attestationUID,
        schema: reviewsSchemaUID,
        attester: reviewerAddress1,
        data: encodedData1,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(attestation1, { from: reviewerAddress1, value: 0 }));

      let request = await deresyAttestations.getRequest(requestName)
      let expectedReviews = [
        [
          reviewerAddress1,
          hypercertID1.toString(),
          attestationUID,
          []
        ],
      ]
      assert.deepEqual(request.reviews, expectedReviews)

      const amendmentAbi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string', name: 'amendment' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      const amendmentEncodedData = web3.eth.abi.encodeParameters(amendmentAbi, [requestName, hypercertID2, "amenmdent text", "pdfIpfsHash", []]);
      const amendmentAttestation = {
        uid: amendmentAttestationUID1,
        schema: amendmentsSchemaUID,
        attester: reviewerAddress1,
        data: amendmentEncodedData,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: attestationUID,
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(amendmentAttestation, { from: reviewerAddress1, value: 0 }));

      request = await deresyAttestations.getRequest(requestName)
      expectedReviews = [
        [
          reviewerAddress1,
          hypercertID1.toString(),
          attestationUID,
          []
        ],
      ]
      assert.deepEqual(request.reviews, expectedReviews)
    })

    it("should not create amendments if reviewer is not attester", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF20"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      

      const requestName = "AA8"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"

      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];

      const encodedData1 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestation1 = {
        uid: attestationUID,
        schema: reviewsSchemaUID,
        attester: reviewerAddress1,
        data: encodedData1,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(attestation1, { from: reviewerAddress1, value: 0 }));

      let request = await deresyAttestations.getRequest(requestName)
      let expectedReviews = [
        [
          reviewerAddress1,
          hypercertID1.toString(),
          attestationUID,
          []
        ],
      ]
      assert.deepEqual(request.reviews, expectedReviews)

      const amendmentAbi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string', name: 'amendment' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      const amendmentEncodedData = web3.eth.abi.encodeParameters(amendmentAbi, [requestName, hypercertID1, "amendment text", "pdfIpfsHash", []]);
      const amendmentAttestation = {
        uid: amendmentAttestationUID1,
        schema: amendmentsSchemaUID,
        attester: reviewerAddress2,
        data: amendmentEncodedData,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: attestationUID,
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(amendmentAttestation, { from: reviewerAddress2, value: 0 }));

      request = await deresyAttestations.getRequest(requestName)
      expectedReviews = [
        [
          reviewerAddress1,
          hypercertID1.toString(),
          attestationUID,
          []
        ],
      ]
      assert.deepEqual(request.reviews, expectedReviews)
    })

    it("should emit the SubmitedAmendment event", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      const reviewFormName = "RSRF21"
      await deresyAttestations.createReviewForm(reviewFormName, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })

      const requestName = "AA9"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let reviewersContracts = []
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"

      await deresyAttestations.createRequest(requestName, reviewersArray, reviewersContracts, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewersArray.length, zeroAddress, reviewFormName, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string[]', name: 'questions' },
        { type: 'string[]', name: 'questionTypes' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];

      const encodedData1 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, questionsArray, questionTypesArray, "pdfIpfsHash", []]);
      const attestation1 = {
        uid: attestationUID,
        schema: reviewsSchemaUID,
        attester: reviewerAddress1,
        data: encodedData1,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      await truffleAssert.passes(deresyAttestations.deresyAttestation(attestation1, { from: reviewerAddress1, value: 0 }));

      let request = await deresyAttestations.getRequest(requestName)
      let expectedReviews = [
        [
          reviewerAddress1,
          hypercertID1.toString(),
          attestationUID,
          []
        ],
      ]
      assert.deepEqual(request.reviews, expectedReviews)

      const amendmentAbi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string', name: 'amendment' },
        { type: 'string', name: 'pdfIpfsHash' },
        { type: 'string[]', name: 'attachmentsIpfsHashes' },
      ];
      const amendmentEncodedData = web3.eth.abi.encodeParameters(amendmentAbi, [requestName, hypercertID1, "amendment text", "pdfIpfsHash", []]);
      const amendmentAttestation = {
        uid: amendmentAttestationUID1,
        schema: amendmentsSchemaUID,
        attester: reviewerAddress1,
        data: amendmentEncodedData,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: attestationUID,
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false
      };
      let tx = await deresyAttestations.deresyAttestation(amendmentAttestation, { from: reviewerAddress1, value: 0 })
      truffleAssert.eventEmitted(tx, 'SubmittedAmendment', (ev) => {
        return ev._uid = amendmentAttestationUID1;
      });
      request = await deresyAttestations.getRequest(requestName)
      expectedReviews = [
        [
          reviewerAddress1,
          hypercertID1.toString(),
          attestationUID,
          [amendmentAttestationUID1]
        ],
      ]
      assert.deepEqual(request.reviews, expectedReviews)
    })
  })
})
