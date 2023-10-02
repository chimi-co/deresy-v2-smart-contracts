const DeresyAttestations = artifacts.require('DeresyAttestations')
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
  const hypercertID1 = toBN("10000218199072539564261652963204804198268928");
  const hypercertID2 = toBN("10000558481439460502725116337812235966480384");
  const rewardPerReview1 = "10000000000000000"
  const easContractAddress = "0x4200000000000000000000000000000000000021"
  const easSchemaID = "0x00000000000000000000000000000001"
  const attestationUID ="0x0000000000000000000000000000000000000000000000000000000000000001"
  const schemaUID = "0x0000000000000000000000000000000000000000000000000000000000000002"
  // End testing variables ----------
  let deresyAttestations
  // Load contract
  before(async ()=> {            
    deresyAttestations = await DeresyAttestations.new(easContractAddress)
    await deresyAttestations.unpause()
  })

  // onAttest ----------
  describe('On Attest', async () => {
    it("should create reviews if data is correct and emit the corresponding events", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyAttestations.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyAttestations.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRS1"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      await deresyAttestations.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      for (let i = 0; i < reviewersArray.length; i++) {
        for (let j = 0; j < hypercertsArray.length; j++) {
          let answersArray = ["choice1", "Yes"]
          const abi = [
            { type: 'string', name: 'requestName' },
            { type: 'uint256', name: 'hypercertID' },
            { type: 'string[]', name: 'answers' },
            { type: 'string', name: 'pdfIpfsHash' },
          ];
          
          const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertsArray[j], answersArray, "pdfIpfsHash"]);
          const attestation = {
            uid: attestationUID,
            schema: schemaUID,
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
          attestationUID
        ],
        [
          reviewerAddress1,
          hypercertID2.toString(),
          attestationUID
        ],
        [
          reviewerAddress2,
          hypercertID1.toString(),
          attestationUID
        ],
        [
          reviewerAddress2,
          hypercertID2.toString(),
          attestationUID
        ],
        [
          reviewerAddress3,
          hypercertID1.toString(),
          attestationUID
        ],
        [
          reviewerAddress3,
          hypercertID2.toString(),
          attestationUID
        ],
      ]
      assert.deepEqual(request.reviews, expectedReviews)
    })

    it("should create reviews if data is correct for free requests and emit the corresponding events", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyAttestations.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyAttestations.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRS1Free"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      await deresyAttestations.createNonPayableRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, reviewFormIndex, { from: ownerAddress })
      
      for (let i = 0; i < reviewersArray.length; i++) {
        for (let j = 0; j < hypercertsArray.length; j++) {
          let answersArray = ["choice1", "Yes"]
          const abi = [
            { type: 'string', name: 'requestName' },
            { type: 'uint256', name: 'hypercertID' },
            { type: 'string[]', name: 'answers' },
            { type: 'string', name: 'pdfIpfsHash' },
          ];
          
          const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertsArray[j], answersArray, "pdfIpfsHash"]);
          const attestation = {
            uid: attestationUID,
            schema: schemaUID,
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
          attestationUID
        ],
        [
          reviewerAddress1,
          hypercertID2.toString(),
          attestationUID
        ],
        [
          reviewerAddress2,
          hypercertID1.toString(),
          attestationUID
        ],
        [
          reviewerAddress2,
          hypercertID2.toString(),
          attestationUID
        ],
        [
          reviewerAddress3,
          hypercertID1.toString(),
          attestationUID
        ],
        [
          reviewerAddress3,
          hypercertID2.toString(),
          attestationUID
        ],
      ]
      assert.deepEqual(request.reviews, expectedReviews)
    })

    it("should not create reviews if attester atttests 2 times for the same hypercertID", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyAttestations.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyAttestations.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRS2"
      let reviewersArray = [reviewerAddress1, reviewerAddress2, reviewerAddress3]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      await deresyAttestations.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string', name: 'pdfIpfsHash' },
      ];
      
      const encodedDataH1 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, "pdfIpfsHash"]);
      const attestationH1 = {
        uid: attestationUID,
        schema: schemaUID,
        attester: reviewerAddress1,
        data: encodedDataH1,
        time: 1695111673n,
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient: "0x0000000000000000000000000000000000000000",
        revocable: false 
      };

      const encodedDataH2 = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID2, answersArray, "pdfIpfsHash"]);
      const attestationH2 = {
        uid: attestationUID,
        schema: schemaUID,
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
      await deresyAttestations.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyAttestations.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRS3"
      let reviewersArray = [reviewerAddress1, reviewerAddress3]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      await deresyAttestations.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string', name: 'pdfIpfsHash' },
      ];
      
      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, "pdfIpfsHash"]);
      const attestation = {
        uid: attestationUID,
        schema: schemaUID,
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

    it("should not create reviews if review request is closed", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyAttestations.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyAttestations.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRS4"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      await deresyAttestations.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      await deresyAttestations.closeReviewRequest(requestName, { from: ownerAddress, value: 0 })

      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string', name: 'pdfIpfsHash' },
      ];
      
      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, "pdfIpfsHash"]);
      const attestation = {
        uid: attestationUID,
        schema: schemaUID,
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
      await deresyAttestations.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyAttestations.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRS5"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let hypercertsArray = [hypercertID1]
      let hypercertsIPFSHashes = ["hash1"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      await deresyAttestations.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })

      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string', name: 'pdfIpfsHash' },
      ];
      
      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID2, answersArray, "pdfIpfsHash"]);
      const attestation = {
        uid: attestationUID,
        schema: schemaUID,
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
      await deresyAttestations.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyAttestations.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRS6"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      await deresyAttestations.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })

      let answersArray = ["choice1", "Yes", "invalidAnswer1", "invalidAnswer2"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string', name: 'pdfIpfsHash' },
      ];
      
      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, "pdfIpfsHash"]);
      const attestation = {
        uid: attestationUID,
        schema: schemaUID,
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
      await deresyAttestations.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyAttestations.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRS7"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      await deresyAttestations.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })

      let answersArray = ["invalidAnswer", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string', name: 'pdfIpfsHash' },
      ];
      
      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, "pdfIpfsHash"]);
      const attestation = {
        uid: attestationUID,
        schema: schemaUID,
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
      await deresyAttestations.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyAttestations.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRS8"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      await deresyAttestations.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })

      let answersArray = ["choice1", "invalidAnswer"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string', name: 'pdfIpfsHash' },
      ];
      
      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, "pdfIpfsHash"]);
      const attestation = {
        uid: attestationUID,
        schema: schemaUID,
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
      await deresyAttestations.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyAttestations.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRS9"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      await deresyAttestations.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })

      let answersArray = ["choice1", ""]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string', name: 'pdfIpfsHash' },
      ];
      
      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, "pdfIpfsHash"]);
      const attestation = {
        uid: attestationUID,
        schema: schemaUID,
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
      await deresyAttestations.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyAttestations.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRS10"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      await deresyAttestations.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string', name: 'pdfIpfsHash' },
      ];
      
      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, "pdfIpfsHash"]);
      const attestation = {
        uid: attestationUID,
        schema: schemaUID,
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

    it("should revert the onAttestattion if contract is paused", async () => {
      let questionsArray = ["Q1", "Q2"]
      let questionTypesArray = [2, 1]
      let choicesArray = [["choice1", "choice2"], []]
      await deresyAttestations.createReviewForm(easSchemaID, questionsArray, choicesArray, questionTypesArray, { from: ownerAddress, value: 0 })
      let reviewFormsTotal = await deresyAttestations.reviewFormsTotal().then(b => { return b.toNumber() })

      let requestName = "RRS11-PAUSE"
      let reviewersArray = [reviewerAddress1, reviewerAddress2]
      let hypercertsArray = [hypercertID1, hypercertID2]
      let hypercertsIPFSHashes = ["hash1", "hash2"]
      let ipfsHash = "hash"
      let reviewFormIndex = reviewFormsTotal - 1
      await deresyAttestations.createRequest(requestName, reviewersArray, hypercertsArray, hypercertsIPFSHashes, ipfsHash, rewardPerReview1, reviewFormIndex, { from: ownerAddress, value: rewardPerReview1 * reviewersArray.length * hypercertsArray.length })
      
      let answersArray = ["choice1", "Yes"]
      const abi = [
        { type: 'string', name: 'requestName' },
        { type: 'uint256', name: 'hypercertID' },
        { type: 'string[]', name: 'answers' },
        { type: 'string', name: 'pdfIpfsHash' },
      ];
      
      await deresyAttestations.pause({ from: ownerAddress });

      const encodedData = web3.eth.abi.encodeParameters(abi, [requestName, hypercertID1, answersArray, "pdfIpfsHash"]);
      const attestation = {
        uid: attestationUID,
        schema: schemaUID,
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
})
