// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.19;
import { SchemaResolver } from "@ethereum-attestation-service/eas-contracts/contracts/resolver/SchemaResolver.sol";
import { IEAS, Attestation } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IOnReviewable.sol";
import "./interfaces/IHypercertable.sol";

contract DeresyResolver is SchemaResolver, Ownable {
  IOnReviewable public callbackContract;
  IHypercertable public hypercertContract;

  enum QuestionType {Text, Checkbox, SingleChoice}

  struct ReviewForm {
    string[] questions;
    QuestionType[] questionTypes;
    string[][] choices;
  }

  struct Review {
    address reviewer;
    uint256 hypercertID;
    bytes32 attestationID;
		bytes32[] amendmentsUIDs;
  }
    
  struct ReviewRequest {
    address sponsor;
    address[] reviewers;
    address[] reviewerContracts;
    uint256[] hypercertIDs;
    string[] hypercertIPFSHashes;
    string formIpfsHash;
    uint256 rewardPerReview;
    uint8 reviewsPerHypercert;
    Review[] reviews;
    bool isClosed;
    address paymentTokenAddress;
    uint256 fundsLeft;
    string reviewFormName;
    string name;
  }

  mapping(string => ReviewRequest) private reviewRequests;

	bytes32 public reviewsSchemaID;
  bytes32 public amendmentsSchemaID;
  
  address[] whitelistedTokens;

  string[] reviewRequestNames;
  
  string public contractVersion = "0.2";

  bool public paused = true;

  bool public validateHypercertIDs = true;

  mapping(string => ReviewForm) private reviewForms;
  string[] reviewFormsNames;

  event CreatedReviewForm(string _formName);
  event CreatedReviewRequest(string _requestName);
  event ClosedReviewRequest(string _requestName);
  event SubmittedReview(string _requestName);
  event OnReviewCallback(Attestation _attestation, string _requestName);
	event SubmittedAmendment(bytes32 _uid);

  constructor(IEAS eas) SchemaResolver(eas) {
    whitelistedTokens.push(address(0));
  }

  /// @notice Checks if a token is whitelisted
  /// @param tokenAddress The address of the token to check
  /// @return Returns true if the token is whitelisted, false otherwise
  function isTokenWhitelisted(address tokenAddress) public view returns (bool) {
    for (uint i = 0; i < whitelistedTokens.length; i++) {
      if (whitelistedTokens[i] == tokenAddress) {
        return true;
      }
    }

    return false;
  }

  /// @notice Adds a token to the whitelist
  /// @dev Only callable by the contract owner
  /// @param tokenAddress The address of the token to be whitelisted
  /// @custom:requires Token must not already be whitelisted
  function whitelistToken(address tokenAddress) external onlyOwner {
    require(!isTokenWhitelisted(tokenAddress), "Token already whitelisted");
    whitelistedTokens.push(tokenAddress);
  }

  /// @notice Removes a token from the whitelist
  /// @dev Only callable by the contract owner
  /// @param tokenAddress The address of the token to be removed from the whitelist
  /// @custom:requires Token must be in the whitelist
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

  /// @notice Modifier that requires the contract to not be paused
  /// @custom:requires Contract must not be paused
  modifier whenUnpaused {
    require(!paused, "Contract is paused");
    _;
  }

  /// @notice Pauses the contract
  /// @dev Only callable by the contract owner and when the contract is not paused
  function pause() external onlyOwner whenUnpaused {
    paused = true;
  }

  /// @notice Unpauses the contract
  /// @dev Only callable by the contract owner
  function unpause() external onlyOwner {
    paused = false;
  }

  /// @notice Processes attestations for reviews or amendments
  /// @dev Called internally, overrides parent function
  /// @param attestation The attestation data
  /// @return Returns true if the attestation is processed successfully
  /// @custom:requires Contract should not be paused
  function onAttest(
    Attestation calldata attestation,
    uint256 /*value*/
  ) internal override whenUnpaused returns (bool) {
    if (attestation.schema == reviewsSchemaID) {
      return processReview(attestation);
    } else if (attestation.schema == amendmentsSchemaID) {
      return processAmendment(attestation);
    } else {
      return false;
    }
  }

  /// @notice Processes a review attestation
  /// @dev Validates and stores review data
  /// @param attestation The review attestation data
  /// @return Returns true if the review is valid and processed, false otherwise
  /// @custom:visibility internal
	function processReview(Attestation calldata attestation) internal returns (bool) {
		(string memory requestName, uint256 hypercertID, string[] memory answers,,,,) = abi.decode(attestation.data, (string, uint256, string[], string[], string[], string, string[]));
    ReviewRequest storage request = reviewRequests[requestName];
    ReviewForm storage requestForm = reviewForms[request.reviewFormName];
    address attester = attestation.attester;
    bytes32 attestationID = attestation.uid;

    if(request.rewardPerReview > 0) {
      require(getNumberOfReviewsForHypercert(requestName, hypercertID) < request.reviewsPerHypercert, "Deresy: Max reviews per hypercert exceeded");
    }

    bool isValid = !request.isClosed && validateHypercertID(request.hypercertIDs, hypercertID) && requestForm.questions.length == answers.length && _isReviewer(attester, requestName) && hasSubmittedReview(attester, requestName, hypercertID) && validateAnswers(requestForm, answers);

    if(isValid){
      request.reviews.push(Review(attester,hypercertID, attestationID, new bytes32[] (0)));
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

  /// @notice Processes an amendment attestation
  /// @dev Validates and stores amendment data
  /// @param attestation The amendment attestation data
  /// @return Returns true if the amendment is valid and processed, false otherwise
  /// @custom:visibility internal
	function processAmendment(Attestation calldata attestation) internal returns (bool) {
    (string memory requestName, uint256 hypercertID, string memory amendment,,) = abi.decode(attestation.data, (string, uint256, string, string, string[]));
    ReviewRequest storage request = reviewRequests[requestName];
    if (request.reviews.length > 0) {
			for (uint i = 0; i < request.reviews.length; i++) {
				if (request.reviews[i].attestationID == attestation.refUID &&
					request.reviews[i].reviewer == attestation.attester &&
					bytes(amendment).length > 0 &&
					request.reviews[i].hypercertID == hypercertID) {
					bool uidExists = false;
					for (uint j = 0; j < request.reviews[i].amendmentsUIDs.length; j++) {
							if (request.reviews[i].amendmentsUIDs[j] == attestation.uid) {
									uidExists = true;
									break;
							}
					}

					if (!uidExists) {
							request.reviews[i].amendmentsUIDs.push(attestation.uid);
							emit SubmittedAmendment(attestation.uid);
							return true;
					}
				}
			}
    }
    return false;
	}

  /// @notice Handles revocation of attestations
  /// @dev Currently always returns true, to be implemented further
  /// @return Always returns true
  function onRevoke(Attestation calldata /*attestation*/, uint256 /*value*/) internal pure override returns (bool) {
    return true;
  }

  /// @notice Creates a new review form
  /// @dev Only callable when the contract is not paused
  /// @param _name The name of the review form
  /// @param questions Array of questions for the review form
  /// @param choices Array of choices for each question
  /// @param questionTypes Array of types for each question
  /// @custom:requires Name must not be null or empty
  /// @custom:requires Review form name must be unique
  /// @custom:requires Questions array cannot be empty
  /// @custom:requires QuestionTypes array cannot be empty
  /// @custom:requires Questions and types must have the same length
  /// @custom:requires Questions and choices must have the same length
  function createReviewForm(string memory _name, string[] memory questions, string[][] memory choices, QuestionType[] memory questionTypes) external whenUnpaused {
    require(bytes(_name).length > 0, "Deresy: Name cannot be null or empty");
    require(reviewForms[_name].questions.length == 0, "Deresy: ReviewFormName already exists");
    require(questions.length > 0, "Deresy: Questions can't be null");
    require(questionTypes.length > 0, "Deresy: Question Types can't be null");
    require(questionTypes.length == questions.length, "Deresy: Questions and types must have the same length");
    require(questions.length == choices.length, "Deresy: Questions and choices must have the same length");
    reviewForms[_name] = ReviewForm(questions, questionTypes, choices);
    reviewFormsNames.push(_name);
    emit CreatedReviewForm(_name);
  }

  /// @notice Common function to create a review request
  /// @dev Used internally by public functions to handle review request creation
  /// @param _name The name of the review request
  /// @param reviewers Array of reviewer addresses
  /// @param hypercertIDs Array of hypercert IDs
  /// @param hypercertIPFSHashes Array of hypercert IPFS hashes
  /// @param formIpfsHash IPFS hash of the form
  /// @param rewardPerReview Reward amount per review
  /// @param reviewFormName Name of the review form
  /// @param paymentTokenAddress Address of the payment token
  /// @param isPayable Flag indicating if the request is payable
  /// @custom:requires Request name must not be null or empty
  /// @custom:requires Reviewers array cannot be empty
  /// @custom:requires Hypercert IDs array cannot be empty
  /// @custom:requires Hypercert IPFS hashes array cannot be empty
  /// @custom:requires HypercertIDs and IPFS hashes must have the same length
  /// @custom:requires Review form name must exist
  /// @custom:requires Request name must be unique
  /// @custom:requires Token must be whitelisted if used
  /// @custom:requires Hypercerts must be valid
  /// @custom:visibility internal
  function createReviewRequestCommon(
      string memory _name,
      address[] memory reviewers,
      address[] memory reviewerContracts,
      uint256[] memory hypercertIDs,
      string[] memory hypercertIPFSHashes,
      string memory formIpfsHash,
      uint256 rewardPerReview,
      uint8 reviewsPerHypercert,
      string memory reviewFormName,
      address paymentTokenAddress,
      bool isPayable
  ) internal {
    require(bytes(_name).length > 0, "Deresy: RequestName cannot be null or empty");
    require(reviewers.length > 0 || reviewerContracts.length > 0, "Deresy: Reviewers cannot be null");
    require(hypercertIDs.length > 0, "Deresy: Hypercert IDs cannot be null");
    require(hypercertIPFSHashes.length > 0, "Deresy: Hypercerts IPFS hashes cannot be null");
    require(hypercertIDs.length == hypercertIPFSHashes.length, "Deresy: HypercertIDs and HypercertIPFSHashes array must have the same length");
    require(reviewForms[reviewFormName].questions.length > 0, "Deresy: ReviewFormName does not exist");
    require(reviewRequests[_name].sponsor == address(0),"Deresy: Name duplicated");
    require(isTokenWhitelisted(paymentTokenAddress),"Deresy: Token is not whitelisted");
    require(validateRequestHypercerts(hypercertIDs), "Deresy: One or more hypercerts are not valid");
    require(allReviewerContractsERC721(reviewerContracts), "Deresy: Not all reviewer contracts are ERC721 contracts");

    uint256 tokenFundsAmount;

    if (isPayable) {
      require(rewardPerReview > 0, "Deresy: rewardPerReview must be greater than zero for payable request");

      if (paymentTokenAddress == address(0)) {
        require(msg.value >= ((reviewsPerHypercert * hypercertIDs.length) * rewardPerReview), "Deresy: msg.value invalid");
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
    reviewRequests[_name].reviewerContracts = reviewerContracts;
    reviewRequests[_name].hypercertIDs = hypercertIDs;
    reviewRequests[_name].hypercertIPFSHashes = hypercertIPFSHashes;
    reviewRequests[_name].formIpfsHash = formIpfsHash;
    reviewRequests[_name].rewardPerReview = isPayable ? rewardPerReview : 0;
    reviewRequests[_name].reviewsPerHypercert = reviewsPerHypercert;
    reviewRequests[_name].isClosed = false;
    reviewRequests[_name].paymentTokenAddress = paymentTokenAddress;
    reviewRequests[_name].fundsLeft = isPayable ? tokenFundsAmount : 0;
    reviewRequests[_name].reviewFormName = reviewFormName;
    reviewRequestNames.push(_name);

    emit CreatedReviewRequest(_name);
  }

  /// @notice Creates a new payable review request
  /// @dev This function creates a review request and allocates funds for it
  /// @param _name The name of the review request
  /// @param reviewers Array of addresses of the reviewers
  /// @param hypercertIDs Array of hypercert IDs associated with the review
  /// @param hypercertIPFSHashes Array of IPFS hashes for the hypercerts
  /// @param formIpfsHash IPFS hash of the review form
  /// @param rewardPerReview Amount of reward per review
  /// @param paymentTokenAddress Address of the payment token
  /// @param reviewFormName Name of the review form
  /// @custom:requires The contract should not be paused
  function createRequest(
    string memory _name,
    address[] memory reviewers,
    address[] memory reviewerContracts,
    uint256[] memory hypercertIDs,
    string[] memory hypercertIPFSHashes,
    string memory formIpfsHash,
    uint256 rewardPerReview,
    uint8 reviewsPerHypercert,
    address paymentTokenAddress,
    string memory reviewFormName
  ) external payable whenUnpaused {
      require(rewardPerReview > 0, "Deresy: Reward per review must be greater than zero for payed requests");
      createReviewRequestCommon(
        _name,
        reviewers,
        reviewerContracts,
        hypercertIDs,
        hypercertIPFSHashes,
        formIpfsHash,
        rewardPerReview,
        reviewsPerHypercert,
        reviewFormName,
        paymentTokenAddress,
        true
      );
  }

  /// @notice Creates a new non-payable review request
  /// @dev This function creates a review request without allocating any funds
  /// @param _name The name of the review request
  /// @param reviewers Array of addresses of the reviewers
  /// @param hypercertIDs Array of hypercert IDs associated with the review
  /// @param hypercertIPFSHashes Array of IPFS hashes for the hypercerts
  /// @param formIpfsHash IPFS hash of the review form
  /// @param reviewFormName Name of the review form
  /// @custom:requires The contract should not be paused
  function createNonPayableRequest(
    string memory _name, 
    address[] memory reviewers,
    address[] memory reviewerContracts,
    uint256[] memory hypercertIDs, 
    string[] memory hypercertIPFSHashes, 
    string memory formIpfsHash,
    string memory reviewFormName
  ) external whenUnpaused {
      createReviewRequestCommon(
        _name, 
        reviewers,
        reviewerContracts,
        hypercertIDs, 
        hypercertIPFSHashes,
        formIpfsHash,
        0,
        0,
        reviewFormName,
        address(0),
        false
      );
  }

  /// @notice Closes an existing review request
  /// @dev Transfers remaining funds back to the sponsor and marks the request as closed
  /// @param _name The name of the review request to close
  /// @custom:requires msg.sender must be the sponsor of the review request
  /// @custom:requires The review request must not already be closed
  function closeReviewRequest(string memory _name) external {
    require(msg.sender == reviewRequests[_name].sponsor, "Deresy: It is not the sponsor");
    require(reviewRequests[_name].isClosed == false,"Deresy: request closed");
    payable(reviewRequests[_name].sponsor).transfer(reviewRequests[_name].fundsLeft);
    reviewRequests[_name].isClosed = true;
    reviewRequests[_name].fundsLeft = 0;
    emit ClosedReviewRequest(_name);
  }
  
  /// @notice Retrieves details of a specific review request
  /// @param _name The name of the review request
  /// @return reviewRequest Returns the review request struct
  function getRequest(string memory _name) public view returns (ReviewRequest memory reviewRequest){
    return reviewRequests[_name];
  }

  /// @notice Retrieves the review form associated with a specific review request
  /// @param _name The name of the review request
  /// @return requestReviewForm Returns the review form struct
  function getRequestReviewForm(string memory _name) public view returns(ReviewForm memory requestReviewForm){
    ReviewRequest storage request = reviewRequests[_name];
    return reviewForms[request.reviewFormName];
  }


  /// @notice Retrieves a specific review form by name
  /// @param _reviewFormName The name of the review form
  /// @return reviewForm Returns the review form struct
  function getReviewForm(string memory _reviewFormName) public view returns(ReviewForm memory reviewForm){
    return reviewForms[_reviewFormName];
  }

  /// @notice Retrieves the names of all review requests
  /// @return An array of review request names
  function getReviewRequestsNames() public view returns(string[] memory){
    return reviewRequestNames;
  }

  /// @notice Retrieves all whitelisted tokens
  /// @return An array of addresses of the whitelisted tokens
  function getWhitelistedTokens() public view returns(address[] memory) {
    return whitelistedTokens;
  }


  /// @notice Retrieves the names of all review forms
  /// @return An array of review form names
  function getReviewFormsNames() public view returns(string[] memory) {
    return reviewFormsNames;
  }

  /// @notice Checks if an address is a reviewer for a specific review request
  /// @param reviewerAddress The address to check
  /// @param _name The name of the review request
  /// @return reviewerFound Returns true if the address is a reviewer, false otherwise
  /// @custom:visibility internal
  function _isReviewer(address reviewerAddress, string memory _name) internal view returns (bool) {
    for (uint i = 0; i < reviewRequests[_name].reviewers.length; i++){
      if(reviewRequests[_name].reviewers[i] == reviewerAddress){
        return true;
      }
    }
    for (uint j = 0; j < reviewRequests[_name].reviewerContracts.length; j++) {
      address erc721Address = reviewRequests[_name].reviewerContracts[j];
      try IERC721(erc721Address).balanceOf(reviewerAddress) returns (uint256 balance) {
        if (balance > 0) {
          return true;
        }
      } catch {
        return false;
      }
    }
    return false;
  }

  /// @notice Returns the total revuews in a review request for a specific hypercertID
  /// @param _name The name of the review request
  /// @param hypercertID The name of the review request
  /// @return reviewerFound Returns true if the address is a reviewer, false otherwise
  /// @custom:visibility internal
  function getNumberOfReviewsForHypercert(string memory _name, uint256 hypercertID) internal view returns (uint256) {
    uint256 count = 0;
    for (uint256 i = 0; i < reviewRequests[_name].reviews.length; i++) {
        if (reviewRequests[_name].reviews[i].hypercertID == hypercertID) {
            count++;
        }
    }
    return count;
  }

  /// @notice Checks if a reviewer has already submitted a review for a specific hypercert
  /// @param reviewerAddress The address of the reviewer
  /// @param _name The name of the review request
  /// @param hypercertID The ID of the hypercert
  /// @return notReviewed Returns true if the review has not been submitted, false otherwise
  /// @custom:visibility internal
  function hasSubmittedReview(address reviewerAddress, string memory _name, uint256 hypercertID) internal view returns (bool) {
    bool notReviewed = true;
    for(uint i = 0; i < reviewRequests[_name].reviews.length; i++) {
      if(reviewRequests[_name].reviews[i].hypercertID == hypercertID && reviewRequests[_name].reviews[i].reviewer == reviewerAddress) {
        notReviewed = false;
      }
    }
    return notReviewed;
  }

  /// @notice Validates the answers submitted in a review form
  /// @param form The review form
  /// @param answers Array of submitted answers
  /// @return Returns true if all answers are valid, false otherwise
  /// @custom:visibility internal
  function validateAnswers(ReviewForm storage form, string[] memory answers) internal view returns (bool) {
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

  /// @notice Validates a hypercert ID against a list of request hypercert IDs
  /// @param requestHypercertIDs Array of hypercert IDs from the request
  /// @param hypercertID The hypercert ID to validate
  /// @return Returns true if the hypercert ID is valid, false otherwise
  /// @custom:visibility internal
  function validateHypercertID(uint256[] memory requestHypercertIDs, uint256 hypercertID) internal pure returns (bool) {
    for (uint256 i = 0; i < requestHypercertIDs.length; i++) {
      if (uint256(requestHypercertIDs[i]) == uint256(hypercertID)) {
        return true;
      }
    }
    return false;
  }

  /// @notice Validates hypercert IDs for a request against the hypercert contract
  /// @param hypercertIDs Array of hypercert IDs to validate
  /// @return Returns true if all hypercert IDs are valid, false otherwise
  function validateRequestHypercerts(uint256[] memory hypercertIDs) internal returns (bool) {
    if (validateHypercertIDs) {
        for (uint256 i = 0; i < hypercertIDs.length; i++) {
            string memory uri = hypercertContract.uri(hypercertIDs[i]);
            if (bytes(uri).length == 0) {
                return false;
            }
        }
    }
    return true;
  }

  /// @notice Validates whether all reviewer contracts are ERC721 contracts
  /// @param reviewerContracts Array of reviewer ERC721 contract addresses
  /// @return isValid True if all reviewer contracts are ERC721 contracts, false otherwise
  /// @custom:visibility internal
  function allReviewerContractsERC721(address[] memory reviewerContracts) internal view returns (bool) {
      for (uint256 i = 0; i < reviewerContracts.length; i++) {
          if (!isERC721Contract(reviewerContracts[i])) {
              return false;
          }
      }
      return true;
  }

  /// @notice Checks if an address is an ERC721 contract
  /// @param contractAddress The address to check
  /// @return isValid True if the address is an ERC721 contract, false otherwise
  /// @custom:visibility internal
  function isERC721Contract(address contractAddress) internal view returns (bool) {
      try IERC721(contractAddress).supportsInterface(0x80ac58cd) returns (bool supported) {
          return supported;
      } catch {
          return false;
      }
  }

  /// @notice Sets the callback contract address
  /// @param _callbackContractAddress The address of the callback contract
  /// @custom:requires Only callable by the owner
  /// @custom:requires Contract should not be paused
  function setCallbackContract(address _callbackContractAddress) external onlyOwner {
    callbackContract = IOnReviewable(_callbackContractAddress);
  }

  /// @notice Sets the hypercert contract address
  /// @param _hypercertContractAddress The address of the hypercert contract
  /// @custom:requires Only callable by the owner
  function setHypercertContract(address _hypercertContractAddress) external onlyOwner {
    hypercertContract = IHypercertable(_hypercertContractAddress);
  }

  /// @notice Enables or disables hypercert ID validation
  /// @param _validateHypercertIDs Boolean flag to enable or disable validation
  /// @custom:requires Only callable by the owner
  function setValidateHypercertIDs(bool _validateHypercertIDs) external onlyOwner {
    validateHypercertIDs = _validateHypercertIDs;
  }

  /// @notice Sets the schema ID for reviews
  /// @param _reviewsSchemaID The new schema ID
  /// @custom:requires Only callable by the owner
	function setReviewsSchemaID(bytes32 _reviewsSchemaID) external onlyOwner {
		reviewsSchemaID = _reviewsSchemaID;
  }

  /// @notice Sets the schema ID for amendments
  /// @param _amendmentsSchemaID The new schema ID
  /// @custom:requires Only callable by the owner
  function setAmendmentsSchemaID(bytes32 _amendmentsSchemaID) external onlyOwner {
		amendmentsSchemaID = _amendmentsSchemaID;
  }

   /// @notice Checks if an address is a reviewer for a specific review request
  /// @param reviewerAddress The address to check
  /// @param _name The name of the review request
  /// @return reviewerFound Returns true if the address is a reviewer, false otherwise
  /// @custom:visibility external
  function isReviewer(address reviewerAddress, string memory _name) public view returns (bool) {
    return _isReviewer(reviewerAddress, _name);
  }
}