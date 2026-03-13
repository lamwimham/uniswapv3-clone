// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "../src/UniswapV3Pool.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract UniswapV3Manager {
    function mint(
        address poolAddress_,
        int24 lowerTick_,
        int24 upperTick_,
        uint128 liquidity_,
        bytes calldata data
    ) public {
        UniswapV3Pool(poolAddress_).mint(
            address(this),
            lowerTick_,
            upperTick_,
            liquidity_,
            data
        );
    }

    function swap(
        address poolAddress_,
        bool zeroForOne,
        uint256 amountSpecified,
        bytes calldata data
    ) public {
        UniswapV3Pool(poolAddress_).swap(address(this), zeroForOne, amountSpecified, data);
    }

    function uniswapV3MintCallback(
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external {
        UniswapV3Pool.CallbackData memory extraData = abi.decode(
            data,
            (UniswapV3Pool.CallbackData)
        );
        // 此处的msg.sender是池子地址，因为回调函数是在池子合约中被调用的
        // 此处的player是用户地址（流动性提供者），需要从用户账户转移token到池子
        // 注意：用户需要先approve管理合约才能完成转账
        IERC20(extraData.token0).transferFrom(extraData.player, msg.sender, amount0);
        IERC20(extraData.token1).transferFrom(extraData.player, msg.sender, amount1);
    }

    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external {
        // 解码回调数据，包含 token0, token1 和 player（用户地址）
        UniswapV3Pool.CallbackData memory extraData = abi.decode(
            data,
            (UniswapV3Pool.CallbackData)
        );
        
        if (amount0Delta > 0) {
            // 从用户账户转移token0到池子
            IERC20(extraData.token0).transferFrom(extraData.player, msg.sender, uint256(amount0Delta));
        }
        if (amount1Delta > 0) {
            // 从用户账户转移token1到池子
            IERC20(extraData.token1).transferFrom(extraData.player, msg.sender, uint256(amount1Delta));
        }
    }
}
