// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../../src/lib/Math.sol";
import "../../src/lib/TickMath.sol";
import "../../src/lib/FullMath.sol";

/**
 * @title Math 库模糊测试
 * @notice 测试流动性计算和价格计算的数学属性
 */
contract MathFuzzTest is Test {
    int24 constant MIN_TICK = -887272;
    int24 constant MAX_TICK = 887272;

    // ==================== calcAmount0Delta 测试 ====================

    /// @dev 测试 amount0 计算的正确性
    function testFuzz_CalcAmount0Delta(
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity
    ) public pure {
        // 约束参数
        tickLower = int24(bound(tickLower, MIN_TICK + 1, MAX_TICK - 100));
        tickUpper = int24(bound(tickUpper, tickLower + 1, MAX_TICK - 1));
        liquidity = uint128(bound(liquidity, 1, type(uint128).max / 2));

        uint160 sqrtPriceLower = TickMath.getSqrtRatioAtTick(tickLower);
        uint160 sqrtPriceUpper = TickMath.getSqrtRatioAtTick(tickUpper);

        uint256 amount0 = Math.calcAmount0Delta(sqrtPriceLower, sqrtPriceUpper, liquidity);

        // amount0 应该大于 0
        assertGt(amount0, 0, "amount0 should be positive");
    }

    /// @dev 测试 amount0 参数交换不变性
    function testFuzz_CalcAmount0DeltaCommutative(
        uint160 sqrtPriceA,
        uint160 sqrtPriceB,
        uint128 liquidity
    ) public pure {
        // 约束 sqrtPrice 在有效范围内
        sqrtPriceA = uint160(bound(sqrtPriceA, TickMath.MIN_SQRT_RATIO + 1, TickMath.MAX_SQRT_RATIO - 1));
        sqrtPriceB = uint160(bound(sqrtPriceB, TickMath.MIN_SQRT_RATIO + 1, TickMath.MAX_SQRT_RATIO - 1));
        liquidity = uint128(bound(liquidity, 1, type(uint128).max / 2));

        // 无论 A 和 B 谁大谁小，结果应该相同
        uint256 amount1 = Math.calcAmount0Delta(sqrtPriceA, sqrtPriceB, liquidity);
        uint256 amount2 = Math.calcAmount0Delta(sqrtPriceB, sqrtPriceA, liquidity);

        assertEq(amount1, amount2, "calcAmount0Delta should be commutative");
    }

    // ==================== calcAmount1Delta 测试 ====================

    /// @dev 测试 amount1 计算的正确性
    function testFuzz_CalcAmount1Delta(
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity
    ) public pure {
        tickLower = int24(bound(tickLower, MIN_TICK + 1, MAX_TICK - 100));
        tickUpper = int24(bound(tickUpper, tickLower + 1, MAX_TICK - 1));
        liquidity = uint128(bound(liquidity, 1, type(uint128).max / 2));

        uint160 sqrtPriceLower = TickMath.getSqrtRatioAtTick(tickLower);
        uint160 sqrtPriceUpper = TickMath.getSqrtRatioAtTick(tickUpper);

        uint256 amount1 = Math.calcAmount1Delta(sqrtPriceLower, sqrtPriceUpper, liquidity);

        // amount1 应该大于 0
        assertGt(amount1, 0, "amount1 should be positive");
    }

    /// @dev 测试 amount1 参数交换不变性
    function testFuzz_CalcAmount1DeltaCommutative(
        uint160 sqrtPriceA,
        uint160 sqrtPriceB,
        uint128 liquidity
    ) public pure {
        sqrtPriceA = uint160(bound(sqrtPriceA, TickMath.MIN_SQRT_RATIO + 1, TickMath.MAX_SQRT_RATIO - 1));
        sqrtPriceB = uint160(bound(sqrtPriceB, TickMath.MIN_SQRT_RATIO + 1, TickMath.MAX_SQRT_RATIO - 1));
        liquidity = uint128(bound(liquidity, 1, type(uint128).max / 2));

        uint256 amount1 = Math.calcAmount1Delta(sqrtPriceA, sqrtPriceB, liquidity);
        uint256 amount2 = Math.calcAmount1Delta(sqrtPriceB, sqrtPriceA, liquidity);

        assertEq(amount1, amount2, "calcAmount1Delta should be commutative");
    }

    // ==================== 流动性与 amount 关系测试 ====================

    /// @dev 测试流动性越大，需要的 amount 越大
    function testFuzz_AmountProportionalToLiquidity(
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity1,
        uint128 liquidity2
    ) public pure {
        tickLower = int24(bound(tickLower, MIN_TICK + 100, MAX_TICK - 100));
        tickUpper = int24(bound(tickUpper, tickLower + 10, MAX_TICK - 1));

        // liquidity2 > liquidity1，使用较大的流动性避免精度问题
        // 使用更大的流动性差距确保结果有明显差异
        liquidity1 = uint128(bound(liquidity1, 1e15, 1e18));
        liquidity2 = uint128(bound(liquidity2, uint256(liquidity1) * 10, 1e21));

        uint160 sqrtPriceLower = TickMath.getSqrtRatioAtTick(tickLower);
        uint160 sqrtPriceUpper = TickMath.getSqrtRatioAtTick(tickUpper);

        uint256 amount0_1 = Math.calcAmount0Delta(sqrtPriceLower, sqrtPriceUpper, liquidity1);
        uint256 amount0_2 = Math.calcAmount0Delta(sqrtPriceLower, sqrtPriceUpper, liquidity2);

        uint256 amount1_1 = Math.calcAmount1Delta(sqrtPriceLower, sqrtPriceUpper, liquidity1);
        uint256 amount1_2 = Math.calcAmount1Delta(sqrtPriceLower, sqrtPriceUpper, liquidity2);

        // 更大的流动性需要更多的 amount
        assertLt(amount0_1, amount0_2, "larger liquidity should need more amount0");
        assertLt(amount1_1, amount1_2, "larger liquidity should need more amount1");
    }

    // ==================== getNextSqrtPriceFromInput 测试 ====================

    /// @dev 测试 zeroForOne = true 时价格下降
    function testFuzz_GetNextSqrtPriceZeroForOne(
        uint128 liquidity,
        uint256 amountIn
    ) public pure {
        // 使用固定的中间价格
        uint160 sqrtPriceCurrent = 79228162514264337593543950336; // ~ price = 1

        // 使用较大的流动性和输入金额确保价格变化明显
        liquidity = uint128(bound(liquidity, 1e20, 1e24));
        amountIn = bound(amountIn, 1e10, uint256(liquidity) / 10);

        uint160 sqrtPriceNext = Math.getNextSqrtPriceFromInput(
            sqrtPriceCurrent,
            liquidity,
            int256(amountIn),
            true // zeroForOne
        );

        // zeroForOne 时，token0 换 token1，价格应该下降
        assertLt(sqrtPriceNext, sqrtPriceCurrent, "sqrtPrice should decrease for zeroForOne");
        // 确保新价格在有效范围内
        assertGe(sqrtPriceNext, TickMath.MIN_SQRT_RATIO, "sqrtPrice should be >= MIN_SQRT_RATIO");
    }

    /// @dev 测试 zeroForOne = false 时价格上升
    function testFuzz_GetNextSqrtPriceOneForZero(
        uint128 liquidity,
        uint256 amountIn
    ) public pure {
        uint160 sqrtPriceCurrent = 79228162514264337593543950336; // ~ price = 1

        // 使用较大的流动性和输入金额确保价格变化明显
        liquidity = uint128(bound(liquidity, 1e20, 1e24));
        amountIn = bound(amountIn, 1e10, uint256(liquidity) / 10);

        uint160 sqrtPriceNext = Math.getNextSqrtPriceFromInput(
            sqrtPriceCurrent,
            liquidity,
            int256(amountIn),
            false // oneForZero
        );

        // oneForZero 时，token1 换 token0，价格应该上升
        assertGt(sqrtPriceNext, sqrtPriceCurrent, "sqrtPrice should increase for oneForZero");
        // 确保新价格在有效范围内
        assertLt(sqrtPriceNext, TickMath.MAX_SQRT_RATIO, "sqrtPrice should be < MAX_SQRT_RATIO");
    }
}