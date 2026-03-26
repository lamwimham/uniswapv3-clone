// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../../src/lib/TickMath.sol";
import "../../src/lib/Math.sol";
import "../../src/lib/FullMath.sol";

/**
 * @title TickMath 模糊测试
 * @notice 测试 Tick 和 sqrtPrice 之间的转换是否符合数学属性
 */
contract TickMathFuzzTest is Test {
    // Tick 的有效范围
    int24 constant MIN_TICK = -887272;
    int24 constant MAX_TICK = 887272;

    // ==================== Tick -> sqrtPrice -> Tick 往返测试 ====================

    /// @dev 测试 tick 到 sqrtPrice 的往返转换一致性
    function testFuzz_TickRoundTrip(int24 tick) public pure {
        // 约束 tick 在有效范围内
        tick = int24(bound(tick, MIN_TICK + 1, MAX_TICK - 1));

        // tick -> sqrtPrice
        uint160 sqrtPriceX96 = TickMath.getSqrtRatioAtTick(tick);

        // sqrtPrice -> tick (取回的 tick 应该等于或接近原始 tick)
        int24 tickBack = TickMath.getTickAtSqrtRatio(sqrtPriceX96);

        // 由于精度问题，返回的 tick 可能等于原始 tick 或小 1
        assertApproxEqAbs(tick, tickBack, 1, "tick round trip failed");
    }

    /// @dev 测试相邻 tick 的 sqrtPrice 关系
    function testFuzz_AdjacentTickSqrtPrice(int24 tick) public pure {
        tick = int24(bound(tick, MIN_TICK + 1, MAX_TICK - 1));

        uint160 sqrtPriceX96 = TickMath.getSqrtRatioAtTick(tick);
        uint160 sqrtPriceX96Next = TickMath.getSqrtRatioAtTick(tick + 1);

        // 下一个 tick 的 sqrtPrice 应该大于当前 tick
        assertGt(sqrtPriceX96Next, sqrtPriceX96, "next tick sqrtPrice should be greater");
    }

    /// @dev 测试 tick 与 sqrtPrice 的单调关系
    function testFuzz_TickSqrtPriceMonotonic(int24 tickA, int24 tickB) public pure {
        tickA = int24(bound(tickA, MIN_TICK + 1, MAX_TICK - 1));
        tickB = int24(bound(tickB, MIN_TICK + 1, MAX_TICK - 1));

        if (tickA == tickB) return;

        uint160 sqrtPriceA = TickMath.getSqrtRatioAtTick(tickA);
        uint160 sqrtPriceB = TickMath.getSqrtRatioAtTick(tickB);

        if (tickA < tickB) {
            assertLt(sqrtPriceA, sqrtPriceB, "sqrtPrice should increase with tick");
        } else {
            assertGt(sqrtPriceA, sqrtPriceB, "sqrtPrice should increase with tick");
        }
    }

    // ==================== 边界值测试 ====================

    /// @dev 测试最小有效 tick
    function testFuzz_MinTick(int24 tick) public pure {
        tick = int24(bound(tick, MIN_TICK, MIN_TICK + 10));

        uint160 sqrtPriceX96 = TickMath.getSqrtRatioAtTick(tick);

        // sqrtPrice 应该在有效范围内
        assertGe(sqrtPriceX96, TickMath.MIN_SQRT_RATIO, "sqrtPrice below min");
        assertLe(sqrtPriceX96, TickMath.MAX_SQRT_RATIO, "sqrtPrice above max");
    }

    /// @dev 测试最大有效 tick
    function testFuzz_MaxTick(int24 tick) public pure {
        tick = int24(bound(tick, MAX_TICK - 10, MAX_TICK));

        uint160 sqrtPriceX96 = TickMath.getSqrtRatioAtTick(tick);

        assertGe(sqrtPriceX96, TickMath.MIN_SQRT_RATIO, "sqrtPrice below min");
        assertLe(sqrtPriceX96, TickMath.MAX_SQRT_RATIO, "sqrtPrice above max");
    }
}