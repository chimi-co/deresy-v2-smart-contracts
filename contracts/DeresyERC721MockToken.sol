// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract DeresyERC721MockToken is ERC721 {
    constructor() ERC721("DeresyERC721MockToken", "D721MKT") {}

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}