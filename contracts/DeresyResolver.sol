// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;
import { SchemaResolver } from "@ethereum-attestation-service/eas-contracts/contracts/resolver/SchemaResolver.sol";
import { IEAS, Attestation } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IOnReviewable.sol";

contract DeresyResolver is SchemaResolver, Ownable {
  IOnReviewable public callbackContract;
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
    uint256[] hypercertIDs;
    string[] hypercertIPFSHashes;
    string formIpfsHash;
    uint256 rewardPerReview;
    Review[] reviews;
    bool isClosed;
    address paymentTokenAddress;
    uint256 fundsLeft;
    uint256 reviewFormIndex;
    string name;
  }

  mapping(string => ReviewRequest) private reviewRequests;
  
  address[] whitelistedTokens;

  string[] reviewRequestNames;
  uint256 public reviewFormsTotal;
  
  string public contractVersion = "0.2";

  bool public paused = true;

  reviewForm[] reviewForms;

  event CreatedReviewForm(uint256 _formId);
  event CreatedReviewRequest(string _requestName);
  event ClosedReviewRequest(string _requestName);
  event SubmittedReview(string _requestName);
  event OnReviewCallback(Attestation _attestation, string _requestName);

  constructor(IEAS eas) SchemaResolver(eas) {
    whitelistedTokens.push(address(0));
  }

  function isTokenWhitelisted(address tokenAddress) public view returns (bool) {
    for (uint i = 0; i < whitelistedTokens.length; i++) {
      if (whitelistedTokens[i] == tokenAddress) {
        return true;
      }
    }

    return false;
  }

  function whitelistToken(address tokenAddress) external onlyOwner {
    require(!isTokenWhitelisted(tokenAddress), "Token already whitelisted");
    whitelistedTokens.push(tokenAddress);
  }

  function unwhitelistToken(address tokenAddress) external onlyOwner {
    require(isTokenWhitelisted(tokenAddress), "Token not in whitelist");

    for (uint i = 0; i < whitelistedTokens.length; i++) {
      if (whitelistedTokens[i] == tokenAddress) {
        whitelistedTokens[i] = whitelistedTokens[whitelistedTokens.length - 1];
        whitelistedTokens.pop();
        break;
      }
    }
  }

  modifier whenUnpaused {
    require(!paused, "Contract is paused");
    _;
  }

  function pause() external onlyOwner whenUnpaused {
    paused = true;
  }

  function unpause() external onlyOwner {
    paused = false;
  }

  function onAttest(
    Attestation calldata attestation,
    uint256 /*value*/
  ) internal override whenUnpaused returns (bool) {
    (string memory requestName, uint256 hypercertID, string[] memory answers,) = abi.decode(attestation.data, (string, uint256, string[], string));
    ReviewRequest storage request = reviewRequests[requestName];
    reviewForm storage requestForm = reviewForms[request.reviewFormIndex];
    address attester = attestation.attester;
    bytes32 attestationID = attestation.uid;

    bool isValid = !request.isClosed && validateHypercertID(request.hypercertIDs, hypercertID) && requestForm.questions.length == answers.length && isReviewer(attester, requestName) && hasSubmittedReview(attester, requestName, hypercertID) && validateAnswers(requestForm, answers);

    if(isValid){
      request.reviews.push(Review(attester,hypercertID, attestationID));
      if (request.rewardPerReview > 0) {
        request.fundsLeft -= request.rewardPerReview;

        if (request.paymentTokenAddress == address(0)) {
          payable(attester).transfer(request.rewardPerReview);
        } else {
          require(IERC20(request.paymentTokenAddress).transfer(attester, request.rewardPerReview), "Token transfer failed");
        }
      }

      if (address(callbackContract) != address(0)){
        callbackContract.onReview(attestation, requestName);
        emit OnReviewCallback(attestation, requestName);
      }
      emit SubmittedReview(requestName);
    }
    return isValid;
  }

  function onRevoke(Attestation calldata /*attestation*/, uint256 /*value*/) internal pure override returns (bool) {
    return true;
  }

  function createReviewForm(bytes32 easSchemaID, string[] memory questions, string[][] memory choices, QuestionType[] memory questionTypes) external whenUnpaused returns (uint256){
    require(easSchemaID != bytes32(0), "Deresy: EAS Schema ID can't be null");
    require(questions.length > 0, "Deresy: Questions can't be null");
    require(questionTypes.length > 0, "Deresy: Question Types can't be null");
    require(questionTypes.length == questions.length, "Deresy: Questions and types must have the same length");
    require(questions.length == choices.length, "Deresy: Questions and choices must have the same length");
    reviewForms.push(reviewForm(easSchemaID, questions, questionTypes, choices));
    reviewFormsTotal += 1;
    emit CreatedReviewForm(reviewForms.length - 1);
    return reviewForms.length - 1;
  }

  function createReviewRequestCommon(
      string memory _name,
      address[] memory reviewers,
      uint256[] memory hypercertIDs,
      string[] memory hypercertIPFSHashes,
      string memory formIpfsHash,
      uint256 rewardPerReview,
      uint256 reviewFormIndex,
      address paymentTokenAddress,
      bool isPayable
  ) internal {
    require(reviewers.length > 0, "Deresy: Reviewers cannot be null");
    require(hypercertIDs.length > 0, "Deresy: Hypercert IDs cannot be null");
    require(hypercertIPFSHashes.length > 0, "Deresy: Hypercerts IPFS hashes cannot be null");
    require(hypercertIDs.length == hypercertIPFSHashes.length, "Deresy: HypercertIDs and HypercertIPFSHashes array must have the same length");
    require(reviewFormIndex <= reviewForms.length - 1, "Deresy: ReviewFormIndex invalid");
    require(reviewRequests[_name].sponsor == address(0),"Deresy: Name duplicated");
    require(isTokenWhitelisted(paymentTokenAddress),"Deresy: Token is not whitelisted");

    uint256 tokenFundsAmount;

    if (isPayable) {
      require(rewardPerReview > 0, "Deresy: rewardPerReview must be greater than zero for payable request");

      if (paymentTokenAddress == address(0)) {
        require(msg.value >= ((reviewers.length * hypercertIDs.length) * rewardPerReview), "Deresy: msg.value invalid");

        tokenFundsAmount = msg.value;
      } else {
        require(msg.value == 0, "Deresy: msg.value is invalid");

        tokenFundsAmount = ((reviewers.length * hypercertIDs.length) * rewardPerReview);

        require(
            IERC20(paymentTokenAddress).transferFrom(msg.sender, address(this), tokenFundsAmount),
            "Deresy: Token transfer failed"
        );
      }

    } else {
        require(rewardPerReview == 0, "Deresy: rewardPerReview must be zero for non-payable request");
    }
    
    reviewRequests[_name].sponsor = msg.sender;
    reviewRequests[_name].reviewers = reviewers;
    reviewRequests[_name].hypercertIDs = hypercertIDs;
    reviewRequests[_name].hypercertIPFSHashes = hypercertIPFSHashes;
    reviewRequests[_name].formIpfsHash = formIpfsHash;
    reviewRequests[_name].rewardPerReview = isPayable ? rewardPerReview : 0;
    reviewRequests[_name].isClosed = false;
    reviewRequests[_name].paymentTokenAddress = paymentTokenAddress;
    reviewRequests[_name].fundsLeft = isPayable ? tokenFundsAmount : 0;
    reviewRequests[_name].reviewFormIndex = reviewFormIndex;
    reviewRequestNames.push(_name);

    emit CreatedReviewRequest(_name);
  }

  function createRequest(
    string memory _name,
    address[] memory reviewers,
    uint256[] memory hypercertIDs,
    string[] memory hypercertIPFSHashes,
    string memory formIpfsHash,
    uint256 rewardPerReview,
    address paymentTokenAddress,
    uint256 reviewFormIndex
  ) external payable whenUnpaused {
      createReviewRequestCommon(
        _name,
        reviewers,
        hypercertIDs,
        hypercertIPFSHashes,
        formIpfsHash,
        rewardPerReview,
        reviewFormIndex,
        paymentTokenAddress,
        true
      );
  }

  function createNonPayableRequest(
    string memory _name, 
    address[] memory reviewers, 
    uint256[] memory hypercertIDs, 
    string[] memory hypercertIPFSHashes, 
    string memory formIpfsHash,
    uint256 reviewFormIndex
  ) external whenUnpaused {
      createReviewRequestCommon(
        _name, 
        reviewers, 
        hypercertIDs, 
        hypercertIPFSHashes,
        formIpfsHash,
        0,
        reviewFormIndex,
        address(0),
        false
      );
  }

  function closeReviewRequest(string memory _name) external {
    require(msg.sender == reviewRequests[_name].sponsor, "Deresy: It is not the sponsor");
    require(reviewRequests[_name].isClosed == false,"Deresy: request closed");
    payable(reviewRequests[_name].sponsor).transfer(reviewRequests[_name].fundsLeft);
    reviewRequests[_name].isClosed = true;
    reviewRequests[_name].fundsLeft = 0;
    emit ClosedReviewRequest(_name);
  }

  function getRequest(string memory _name) public view returns (address[] memory reviewers, uint256[] memory hypercertIDs, string[] memory hypercertIPFSHashes, string memory formIpfsHash, uint256 rewardPerReview,Review[] memory reviews, uint256 reviewFormIndex,bool isClosed){
    ReviewRequest memory request = reviewRequests[_name];
    return (request.reviewers, request.hypercertIDs, request.hypercertIPFSHashes, request.formIpfsHash, request.rewardPerReview, request.reviews, request.reviewFormIndex, request.isClosed);
  }

  function getReviewForm(uint256 _reviewFormIndex) public view returns(string[] memory questions, QuestionType[] memory questionTypes, string[][] memory choices, bytes32 easSchemaID){
    return (reviewForms[_reviewFormIndex].questions, reviewForms[_reviewFormIndex].questionTypes, reviewForms[_reviewFormIndex].choices, reviewForms[_reviewFormIndex].easSchemaID);
  }

  function getReviewRequestsNames() public view returns(string[] memory){
    return reviewRequestNames;
  }

  function getRequestReviewForm(string memory _name) public view returns(string[] memory, QuestionType[] memory, string[][] memory choices, bytes32){
    ReviewRequest storage request = reviewRequests[_name];
    reviewForm storage requestForm = reviewForms[request.reviewFormIndex];
     return (requestForm.questions, requestForm.questionTypes, requestForm.choices, requestForm.easSchemaID);
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

  function validateAnswers(reviewForm storage form, string[] memory answers) internal view returns (bool) {
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
      } else if(form.questionTypes[i] == QuestionType.Checkbox) {
        if(keccak256(abi.encodePacked(answers[i])) == keccak256(abi.encodePacked("Yes")) || keccak256(abi.encodePacked(answers[i])) == keccak256(abi.encodePacked("No"))) {
          return true;
        } else {
          return false;
        }
      } else{
        if (bytes(answers[i]).length == 0) {
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

   function setCallbackContract(address _callbackContractAddress) external onlyOwner {
    callbackContract = IOnReviewable(_callbackContractAddress);
  }
}
