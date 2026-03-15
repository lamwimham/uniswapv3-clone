// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/lib/Math.sol";
import "../src/lib/TickMath.sol";

contract DebugSwapTest2 is Test {
    // 测试 zeroForOne = false (用 token1 换 token0)
    function testDebugMathZeroForOneFalse() public pure {
        // 池子当前状态
        // token0 = WETH, token1 = USDC
        uint160 sqrtPriceX96 = 79228162514264337593543950336; // 2^96, 价格 = 1
        uint128 liquidity = 100000000000000000000; // 100 ETH
        uint256 amountIn = 1e18; // 1 USDC (token1)
        
        console.log("=== zeroForOne = false (token1 -> token0) ===");
        console.log("sqrtPriceX96:", sqrtPriceX96);
        console.log("liquidity:", liquidity);
        console.log("amountIn (token1):", amountIn);
        
        // 用 token1 换 token0，价格应该下降
        uint160 sqrtPriceAfter = Math.getNextSqrtPriceFromAmount1RoundingDown(
            sqrtPriceX96,
            liquidity,
            amountIn
        );
        
        console.log("sqrtPriceAfter:", sqrtPriceAfter);
        console.log("sqrtPriceAfter < sqrtPriceX96:", sqrtPriceAfter < sqrtPriceX96);
        
        // 计算输出 (token0)
        uint256 amountOut = Math.calcAmount0Delta(sqrtPriceX96, sqrtPriceAfter, liquidity);
        console.log("amountOut (token0):", amountOut);
        console.log("amountOut in ETH:", amountOut / 1e18);
    }
    
    // 测试完整的 swap 流程
    function testDebugSwapFlow() public pure {
        uint160 sqrtPriceX96 = 79228162514264337593543950336;
        uint128 liquidity = 100000000000000000000;
        uint256 amountIn = 1e18;
        bool zeroForOne = false;
        
        console.log("=== Full Swap Flow ===");
        
        // 1. 计算新价格
        uint160 sqrtPriceAfter = Math.getNextSqrtPriceFromInput(
            sqrtPriceX96,
            liquidity,
            int256(int256(amountIn)),
            zeroForOne
        );
        console.log("sqrtPriceAfter:", sqrtPriceAfter);
        
        // 2. 计算输出
        uint256 amountOut;
        if (zeroForOne) {
            amountOut = Math.calcAmount1Delta(sqrtPriceX96, sqrtPriceAfter, liquidity);
        } else {
            amountOut = Math.calcAmount0Delta(sqrtPriceX96, sqrtPriceAfter, liquidity);
        }
        console.log("amountOut:", amountOut);
        
        // 3. 检查输出是否为0
        require(amountOut > 0, "amountOut is 0");
        
        // 4. 计算 amount0 和 amount1
        int256 amount0;
        int256 amount1;
        if (zeroForOne) {
            amount0 = int256(amountIn);
            amount1 = -int256(amountOut);
        } else {
            amount0 = -int256(amountOut);
            amount1 = int256(amountIn);
        }
        console.log("amount0:", uint256(amount0));
        console.log("amount1:", int256(amount1));
    }
}
