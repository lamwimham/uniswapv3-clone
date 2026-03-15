// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/lib/Math.sol";
import "../src/lib/TickMath.sol";

contract DebugSwapTest is Test {
    function testDebugMath() public pure {
        // 池子当前状态
        uint160 sqrtPriceX96 = 79228162514264337593543950336; // 2^96
        uint128 liquidity = 100100000000000000000; // ~100 ETH
        uint256 amountIn = 1e18; // 1 USDC
        
        console.log("sqrtPriceX96:", sqrtPriceX96);
        console.log("liquidity:", liquidity);
        console.log("amountIn:", amountIn);
        
        // 模拟 zeroForOne = true (用 USDC 换 WETH)
        uint160 sqrtPriceAfter = Math.getNextSqrtPriceFromAmount0RoundingUp(
            sqrtPriceX96,
            liquidity,
            amountIn
        );
        
        console.log("sqrtPriceAfter:", sqrtPriceAfter);
        console.log("sqrtPriceAfter < sqrtPriceX96:", sqrtPriceAfter < sqrtPriceX96);
        
        // 计算输出
        uint256 amountOut = Math.calcAmount1Delta(sqrtPriceX96, sqrtPriceAfter, liquidity);
        console.log("amountOut:", amountOut);
    }
    
    function testDebugMathSmall() public pure {
        // 用更小的金额测试
        uint160 sqrtPriceX96 = 79228162514264337593543950336; // 2^96
        uint128 liquidity = 100100000000000000000;
        uint256 amountIn = 1e15; // 0.001 USDC
        
        console.log("=== Small amount test ===");
        console.log("amountIn:", amountIn);
        
        uint160 sqrtPriceAfter = Math.getNextSqrtPriceFromAmount0RoundingUp(
            sqrtPriceX96,
            liquidity,
            amountIn
        );
        
        console.log("sqrtPriceAfter:", sqrtPriceAfter);
        
        uint256 amountOut = Math.calcAmount1Delta(sqrtPriceX96, sqrtPriceAfter, liquidity);
        console.log("amountOut:", amountOut);
    }
}
