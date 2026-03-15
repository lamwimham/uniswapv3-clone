// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/lib/Math.sol";
import "../src/lib/TickMath.sol";

contract DebugMintTest is Test {
    function testDebugMintAboveRange() public pure {
        // 当前价格 > upperTick: 只需要 token1
        uint160 sqrtPriceX96 = 2185953633790426088568038743051;
        int24 currentTick = 66352;
        int24 lowerTick = 62100;
        int24 upperTick = 62520;
        uint128 liquidity = 1000000000000000000;
        
        console.log("=== Case 1: currentTick > upperTick ===");
        console.log("currentTick:", uint256(int256(currentTick)));
        console.log("upperTick:", uint256(int256(upperTick)));
        
        uint160 sqrtPriceAtLower = TickMath.getSqrtRatioAtTick(lowerTick);
        uint160 sqrtPriceAtUpper = TickMath.getSqrtRatioAtTick(upperTick);
        
        // 只需要 token1
        uint256 amount0 = 0;
        uint256 amount1 = Math.calcAmount1Delta(sqrtPriceAtLower, sqrtPriceAtUpper, liquidity);
        
        console.log("amount0 (should be 0):", amount0);
        console.log("amount1:", amount1);
        console.log("amount1 in USDC:", amount1 / 1e18);
    }
    
    function testDebugMintBelowRange() public pure {
        // 当前价格 < lowerTick: 只需要 token0
        uint160 sqrtPriceX96 = 79228162514264337593543950336; // tick 0
        int24 currentTick = 0;
        int24 lowerTick = 1000;
        int24 upperTick = 2000;
        uint128 liquidity = 1000000000000000000;
        
        console.log("=== Case 2: currentTick < lowerTick ===");
        console.log("currentTick:", uint256(int256(currentTick)));
        console.log("lowerTick:", uint256(int256(lowerTick)));
        
        uint160 sqrtPriceAtLower = TickMath.getSqrtRatioAtTick(lowerTick);
        uint160 sqrtPriceAtUpper = TickMath.getSqrtRatioAtTick(upperTick);
        
        // 只需要 token0
        uint256 amount0 = Math.calcAmount0Delta(sqrtPriceAtLower, sqrtPriceAtUpper, liquidity);
        uint256 amount1 = 0;
        
        console.log("amount0:", amount0);
        console.log("amount1 (should be 0):", amount1);
    }
    
    function testDebugMintInRange() public pure {
        // 当前价格在范围内: 需要两种 token
        uint160 sqrtPriceX96 = 79228162514264337593543950336; // tick 0
        int24 currentTick = 0;
        int24 lowerTick = -1000;
        int24 upperTick = 1000;
        uint128 liquidity = 1000000000000000000;
        
        console.log("=== Case 3: lowerTick <= currentTick < upperTick ===");
        console.log("currentTick:", uint256(int256(currentTick)));
        console.log("lowerTick:", uint256(int256(lowerTick)));
        console.log("upperTick:", uint256(int256(upperTick)));
        
        uint160 sqrtPriceAtLower = TickMath.getSqrtRatioAtTick(lowerTick);
        uint160 sqrtPriceAtUpper = TickMath.getSqrtRatioAtTick(upperTick);
        
        // 需要两种 token
        uint256 amount0 = Math.calcAmount0Delta(sqrtPriceX96, sqrtPriceAtUpper, liquidity);
        uint256 amount1 = Math.calcAmount1Delta(sqrtPriceX96, sqrtPriceAtLower, liquidity);
        
        console.log("amount0:", amount0);
        console.log("amount1:", amount1);
    }
}
