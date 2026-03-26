// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "../src/UniswapV3Pool.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./UniswapV3Factory.sol";

contract UniswapV3Manager {
    UniswapV3Factory public immutable factory;

    constructor(address factory_) {
        factory = UniswapV3Factory(factory_);
    }

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

    /// @dev 验证调用者是 Factory 创建的合法池子
    function _checkPool(address pool) internal view {
        address token0 = UniswapV3Pool(pool).token0();
        address token1 = UniswapV3Pool(pool).token1();
        uint24 fee = UniswapV3Pool(pool).fee();
        address expectedPool = factory.getPool(token0, token1, fee);
        require(pool == expectedPool, "Invalid pool");
    }

    function uniswapV3MintCallback(
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external {
        _checkPool(msg.sender);
        
        UniswapV3Pool.CallbackData memory extraData = abi.decode(
            data,
            (UniswapV3Pool.CallbackData)
        );
        
        require(extraData.player == tx.origin, "Invalid player");
        
        IERC20(extraData.token0).transferFrom(extraData.player, msg.sender, amount0);
        IERC20(extraData.token1).transferFrom(extraData.player, msg.sender, amount1);
    }

    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external {
        _checkPool(msg.sender);
        
        UniswapV3Pool.CallbackData memory extraData = abi.decode(
            data,
            (UniswapV3Pool.CallbackData)
        );

        require(extraData.player == tx.origin, "Invalid player");

        if (amount0Delta > 0) {
            IERC20(extraData.token0).transferFrom(extraData.player, msg.sender, uint256(amount0Delta));
        }
        if (amount1Delta > 0) {
            IERC20(extraData.token1).transferFrom(extraData.player, msg.sender, uint256(amount1Delta));
        }
    }
}