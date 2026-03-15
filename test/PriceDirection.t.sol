// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/lib/Math.sol";

contract PriceDirectionTest is Test {
    function testPriceDirection() public pure {
        // sqrtPrice = sqrt(token1/token0) * 2^96
        uint160 sqrtPriceX96 = 79228162514264337593543950336; // 2^96
        uint128 liquidity = 100000000000000000000;
        uint256 amountIn = 1e18;
        
        console.log("=== Price Direction Analysis ===");
        console.log("sqrtPrice = sqrt(token1/token0) * 2^96");
        console.log("Initial sqrtPriceX96:", sqrtPriceX96);
        
        // Case 1: zeroForOne = true (sell token0, buy token1)
        uint160 sqrtPriceAfter0 = Math.getNextSqrtPriceFromAmount0RoundingUp(
            sqrtPriceX96, liquidity, amountIn
        );
        console.log("");
        console.log("Case 1: zeroForOne = true (sell token0)");
        console.log("  sqrtPriceAfter:", sqrtPriceAfter0);
        console.log("  sqrtPrice decreased:", sqrtPriceAfter0 < sqrtPriceX96);
        
        // Case 2: zeroForOne = false (sell token1, buy token0)
        uint160 sqrtPriceAfter1 = Math.getNextSqrtPriceFromAmount1RoundingDown(
            sqrtPriceX96, liquidity, amountIn
        );
        console.log("");
        console.log("Case 2: zeroForOne = false (sell token1)");
        console.log("  sqrtPriceAfter:", sqrtPriceAfter1);
        console.log("  sqrtPrice decreased:", sqrtPriceAfter1 < sqrtPriceX96);
        
        console.log("");
        console.log("ANALYSIS:");
        console.log("  sqrtPrice = sqrt(token1/token0)");
        console.log("  When selling token1 (USDC) to buy token0 (WETH):");
        console.log("    - token1 increases in pool");
        console.log("    - token0 decreases in pool");
        console.log("    - token1/token0 ratio should INCREASE");
        console.log("    - sqrtPrice should INCREASE");
        console.log("  But current code DECREASES sqrtPrice - THIS IS WRONG!");
    }
}
