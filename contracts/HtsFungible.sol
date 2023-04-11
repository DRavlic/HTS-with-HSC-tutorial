// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "./hip-206/HederaTokenService.sol";
import "./hip-206/HederaResponseCodes.sol";

contract HtsFungible is HederaTokenService {
    address public tokenAddress;

    constructor(address _tokenAddress) {
        tokenAddress = _tokenAddress;
    }

    function mintToken(int64 _amount) external {
        (int response, , ) = HederaTokenService.mintToken(
            tokenAddress,
            _amount,
            new bytes[](0)
        );
        if (response != HederaResponseCodes.SUCCESS) {
            revert("Mint failed!");
        }
    }

    function burnToken(int64 _amount) external {
        (int response, ) = HederaTokenService.burnToken(
            tokenAddress,
            _amount,
            new int64[](0)
        );

        if (response != HederaResponseCodes.SUCCESS) {
            revert("Burn failed!");
        }
    }

    function associateToken(address _account) external {
        int response = HederaTokenService.associateToken(
            _account,
            tokenAddress
        );

        if (response != HederaResponseCodes.SUCCESS) {
            revert("Association failed!");
        }
    }

    function transferToken(
        address _sender,
        address _recipient,
        int64 _amount
    ) external {
        int response = HederaTokenService.transferToken(
            tokenAddress,
            _sender,
            _recipient,
            _amount
        );

        if (response != HederaResponseCodes.SUCCESS) {
            revert("Transfer failed!");
        }
    }
}
