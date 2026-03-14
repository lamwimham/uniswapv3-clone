// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./UniswapV3Pool.sol";
import "./UniswapV3Factory.sol";
import "./lib/TickMath.sol";
import "./lib/Math.sol";

contract UniswapV3Quoter {
    // 事件
    event QuoteResultEvent(
        address indexed pool,
        bool zeroForOne,
        uint256 amountIn,
        uint256 amountOut,
        uint160 sqrtPriceX96After,
        int24 tickAfter
    );

    /**
     * @notice 静态报价函数（不修改状态）
     * 使用纯数学计算，不执行实际 swap
     * @param pool 池子地址
     * @param zeroForOne 是否用 token0 换 token1
     * @param amountIn 输入金额
     * @return amountOut 输出金额
     * @return sqrtPriceX96After swap 后的价格
     * @return tickAfter swap 后的 tick
     */
    function quoteStatic(
        address pool,
        bool zeroForOne,
        uint256 amountIn
    ) external view returns (uint256 amountOut, uint160 sqrtPriceX96After, int24 tickAfter) {
        // 获取池子当前状态
        (uint160 sqrtPriceX96, int24 currentTick) = UniswapV3Pool(pool).slot0();
        uint128 liquidity = UniswapV3Pool(pool).liquidity();

        if (liquidity == 0 || amountIn == 0) {
            return (0, sqrtPriceX96, currentTick);
        }

        // 计算新的 sqrtPrice
        sqrtPriceX96After = Math.getNextSqrtPriceFromInput(
            sqrtPriceX96,
            liquidity,
            int256(uint256(amountIn)),
            zeroForOne
        );

        // 计算输出金额
        if (zeroForOne) {
            // 用 token0 换 token1
            amountOut = Math.calcAmount1Delta(sqrtPriceX96, sqrtPriceX96After, liquidity);
        } else {
            // 用 token1 换 token0
            amountOut = Math.calcAmount0Delta(sqrtPriceX96, sqrtPriceX96After, liquidity);
        }

        // 计算新的 tick
        tickAfter = TickMath.getTickAtSqrtRatio(sqrtPriceX96After);

        return (amountOut, sqrtPriceX96After, tickAfter);
    }

    /**
     * @notice 通过工厂地址计算报价
     * @param factory 工厂合约地址
     * @param tokenIn 输入代币地址
     * @param tokenOut 输出代币地址
     * @param fee 费率
     * @param amountIn 输入金额
     * @return amountOut 输出金额
     * @return pool 池子地址
     */
    function quoteByTokens(
        address factory,
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn
    ) external view returns (uint256 amountOut, address pool) {
        // 获取池子地址
        pool = UniswapV3Factory(factory).getPool(tokenIn, tokenOut, fee);
        require(pool != address(0), "Pool not found");

        // 确定 zeroForOne
        bool zeroForOne = tokenIn < tokenOut;

        // 获取池子状态
        (uint160 sqrtPriceX96,) = UniswapV3Pool(pool).slot0();
        uint128 liquidity = UniswapV3Pool(pool).liquidity();

        if (liquidity == 0 || amountIn == 0) {
            return (0, pool);
        }

        // 计算新的 sqrtPrice
        uint160 sqrtPriceX96After = Math.getNextSqrtPriceFromInput(
            sqrtPriceX96,
            liquidity,
            int256(uint256(amountIn)),
            zeroForOne
        );

        // 计算输出金额
        if (zeroForOne) {
            amountOut = Math.calcAmount1Delta(sqrtPriceX96, sqrtPriceX96After, liquidity);
        } else {
            amountOut = Math.calcAmount0Delta(sqrtPriceX96, sqrtPriceX96After, liquidity);
        }

        return (amountOut, pool);
    }
}