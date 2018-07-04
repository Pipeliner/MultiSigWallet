pragma solidity ^0.4.15;

import "./MintableToken.sol";


/// @title Test token contract - Allows testing of token transfers with multisig wallet.
contract TestToken is MintableToken {
    string constant public name = "Test Token";
    string constant public symbol = "TT";
    uint8 constant public decimals = 1;

    bool public transfersAllowed = false;

    function transfer(address _to, uint256 _value) public returns (bool) {
        require(transfersAllowed);
        return BasicToken.transfer(_to, _value);
    }

    function allowTransfers() public onlyOwner {
        transfersAllowed = true;
    }

    function sendEther(address _to, uint256 _value) public onlyOwner {
        _to.transfer(_value);
    }

    function () public payable {}
}
