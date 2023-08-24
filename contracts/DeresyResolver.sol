// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;
import { SchemaResolver } from "@ethereum-attestation-service/eas-contracts/contracts/resolver/SchemaResolver.sol";
import { IEAS, Attestation } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";

contract DeresyResolver is SchemaResolver{
  enum QuestionType {Text, Checkbox, SingleChoice}

  struct reviewForm {
    bytes32 easSchemaID ;
    string[] questions;
    QuestionType[] questionTypes;
    string[][] choices;
  }

  struct Review {
    address reviewer;
    uint256 hypercertID;
    bytes32 attestationID;
  }
    
  struct ReviewRequest {
    address sponsor;
    address[] reviewers;
    uint256[] hypercertTargetIDs;
    string[] targetsIPFSHashes;
    string formIpfsHash;
    uint256 rewardPerReview;
    Review[] reviews;
    bool isClosed;
    uint256 fundsLeft;
    uint256 reviewFormIndex;
    string name;
  }

  mapping(string => ReviewRequest) private reviewRequests;

  string[] reviewRequestNames;
  uint256 public reviewFormsTotal;
  
  string public contractVersion = "0.2";

  reviewForm[] reviewForms;

  event CreatedReviewForm(uint256 _formId);
  event CreatedReviewRequest(string _requestName);
  event ClosedReviewRequest(string _requestName);
  event SubmittedReview(string _requestName);

  constructor(IEAS eas) SchemaResolver(eas) {}

  function onAttest(Attestation calldata attestation, uint256 /*value*/) internal override returns (bool) {
    (string memory requestName, uint256 hypercertID, string[] memory answers ) = abi.decode(attestation.data, (string, uint256, string[]));
    ReviewRequest storage request = reviewRequests[requestName];
    reviewForm storage requestForm = reviewForms[request.reviewFormIndex];
    address attester = attestation.attester;
    bytes32 attestationID = attestation.uid;

    bool isRequestOpen = !request.isClosed;
    bool isValidHypercert = validateHypercertID(request.hypercertTargetIDs, hypercertID);
    bool hasMatchingAnswerCount = requestForm.questions.length == answers.length;
    bool isUserReviewer = isReviewer(attester, requestName);
    bool hasSubmitted = hasSubmittedReview(attester, requestName, hypercertID);
    bool validSingleChoiceAnswers = validateSingleChoiceAnswers(requestForm, answers);

    bool isValid = isRequestOpen && isValidHypercert && hasMatchingAnswerCount && isUserReviewer && hasSubmitted && validSingleChoiceAnswers;

    if(isValid){
      request.reviews.push(Review(attester,hypercertID, attestationID));
      request.fundsLeft -= request.rewardPerReview;
      payable(attester).transfer(request.rewardPerReview);
      emit SubmittedReview(requestName);
    }
    return isValid;
  }

  function onRevoke(Attestation calldata /*attestation*/, uint256 /*value*/) internal pure override returns (bool) {
    return true;
  }

  function createReviewForm(bytes32 easSchemaID, string[] memory questions, string[][] memory choices, QuestionType[] memory questionTypes) external  returns (uint256){
    require(questions.length > 0, "Deresy: Questions can't be null");
    require(questionTypes.length > 0, "Deresy: Question Types can't be null");
    require(questionTypes.length == questions.length, "Deresy: Questions and types must have the same length");
    require(questions.length == choices.length, "Deresy: Questions and choices must have the same length");
    reviewForms.push(reviewForm(easSchemaID, questions, questionTypes, choices));
    reviewFormsTotal += 1;
    emit CreatedReviewForm(reviewForms.length - 1);
    return reviewForms.length - 1;
  }

  function createRequest(string memory _name, address[] memory reviewers, uint256[] memory hypercertTargetIDs, string[] memory targetsIPFSHashes, string memory formIpfsHash, uint256 rewardPerReview, uint256 reviewFormIndex) external payable{
    require(reviewers.length > 0,"Deresy: Reviewers cannot be null");
    require(hypercertTargetIDs.length > 0,"Deresy: Targets cannot be null");
    require(targetsIPFSHashes.length > 0, "Deresy: Targets IPFS hashes cannot be null");
    require(hypercertTargetIDs.length == targetsIPFSHashes.length, "Deresy: Targets and targetsIPFSHashes array must have the same length");
    require(reviewFormIndex <= reviewForms.length - 1,"Deresy: ReviewFormIndex invalid");
    require(rewardPerReview > 0,"Deresy: rewardPerReview cannot be empty");
    require(reviewRequests[_name].sponsor == address(0),"Deresy: Name duplicated");
    require(msg.value >= ((reviewers.length * hypercertTargetIDs.length) * rewardPerReview),"Deresy: msg.value invalid");
    reviewRequests[_name].sponsor = msg.sender;
    reviewRequests[_name].reviewers = reviewers;
    reviewRequests[_name].hypercertTargetIDs = hypercertTargetIDs;
    reviewRequests[_name].targetsIPFSHashes = targetsIPFSHashes;
    reviewRequests[_name].formIpfsHash = formIpfsHash;
    reviewRequests[_name].rewardPerReview = rewardPerReview;
    reviewRequests[_name].isClosed = false;
    reviewRequests[_name].fundsLeft = msg.value;
    reviewRequests[_name].reviewFormIndex = reviewFormIndex;
    reviewRequestNames.push(_name);
    emit CreatedReviewRequest(_name);
  }

  function closeReviewRequest(string memory _name) external{
    require(msg.sender == reviewRequests[_name].sponsor, "Deresy: It is not the sponsor");
    require(reviewRequests[_name].isClosed == false,"Deresy: request closed");
    payable(reviewRequests[_name].sponsor).transfer(reviewRequests[_name].fundsLeft);
    reviewRequests[_name].isClosed = true;
    reviewRequests[_name].fundsLeft = 0;
    emit ClosedReviewRequest(_name);
  }

  function getRequest(string memory _name) public view returns (address[] memory reviewers, uint256[] memory hypercertTargetIDs, string[] memory targetsIPFSHashes, string memory formIpfsHash, uint256 rewardPerReview,Review[] memory reviews, uint256 reviewFormIndex,bool isClosed){
    ReviewRequest memory request = reviewRequests[_name];
    return (request.reviewers, request.hypercertTargetIDs, request.targetsIPFSHashes, request.formIpfsHash, request.rewardPerReview, request.reviews, request.reviewFormIndex, request.isClosed);
  }

  function getReviewForm(uint256 _reviewFormIndex) public view returns(string[] memory, QuestionType[] memory, string[][] memory choices, bytes32){
    return (reviewForms[_reviewFormIndex].questions, reviewForms[_reviewFormIndex].questionTypes, reviewForms[_reviewFormIndex].choices, reviewForms[_reviewFormIndex].easSchemaID);
  }

  function getRequestReviewForm(string memory _name) public view returns(string[] memory, QuestionType[] memory, string[][] memory choices, bytes32){
    ReviewRequest storage request = reviewRequests[_name];
    reviewForm storage requestForm = reviewForms[request.reviewFormIndex];
    return (requestForm.questions, requestForm.questionTypes, requestForm.choices, requestForm.easSchemaID);
  }

  function getReviewRequestsNames() public view returns(string[] memory){
    return reviewRequestNames;
  }

  function isReviewer(address reviewerAddress, string memory _name) internal view returns (bool) {
    bool reviewerFound = false;
    for (uint i = 0; i < reviewRequests[_name].reviewers.length; i++){
      if(reviewRequests[_name].reviewers[i] == reviewerAddress){
        reviewerFound = true;
      }
    }
    return reviewerFound;
  }

  function hasSubmittedReview(address reviewerAddress, string memory _name, uint256 hypercertID) internal view returns (bool) {
    bool notReviewed = true;
    for(uint i = 0; i < reviewRequests[_name].reviews.length; i++) {
      if(reviewRequests[_name].reviews[i].hypercertID == hypercertID && reviewRequests[_name].reviews[i].reviewer == reviewerAddress) {
        notReviewed = false;
      }
    }
    return notReviewed;
  }

  function validateSingleChoiceAnswers(reviewForm storage form, string[] memory answers) internal view returns (bool) {
    for (uint256 i = 0; i < answers.length; i++) {
      if (form.questionTypes[i] == QuestionType.SingleChoice) {
        bool isValidAnswer = false;
        for (uint256 j = 0; j < form.choices[i].length; j++) {
          if (keccak256(abi.encodePacked(form.choices[i][j])) == keccak256(abi.encodePacked(answers[i]))) {
            isValidAnswer = true;
            break;
          }
        }
        
        if (!isValidAnswer) {
          return false;
        }
      }
    }
    return true;
  }

  function validateHypercertID(uint256[] memory requestHypercertIDs, uint256 hypercertID) internal pure returns (bool) {
    for (uint256 i = 0; i < requestHypercertIDs.length; i++) {
      if (uint256(requestHypercertIDs[i]) == uint256(hypercertID)) {
        return true;
      }
    }
    return false;
  }
}
