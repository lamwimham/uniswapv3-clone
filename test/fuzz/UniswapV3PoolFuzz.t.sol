// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../ERC20Mintable.sol";
import "../../src/UniswapV3Pool.sol";
import "../../src/lib/TickMath.sol";

/**
 * @title UniswapV3Pool 模糊测试
 * @notice 测试 Pool 的 swap 和 mint 操作的不变量
 */
contract UniswapV3PoolFuzzTest is Test {
    ERC20Mintable token0;
    ERC20Mintable token1;
    UniswapV3Pool pool;

    int24 constant MIN_TICK = -887272;
    int24 constant MAX_TICK = 887272;

    // 默认测试参数
    int24 defaultTick = 85176;
    uint160 defaultSqrtPriceX96 = 5602277097478614198912276234240;

    function setUp() public {
        token0 = new ERC20Mintable("Wrapped Ether", "WETH", 18);
        token1 = new ERC20Mintable("USD Coin", "USDC", 18);

        pool = new UniswapV3Pool(
            address(token0),
            address(token1),
            defaultSqrtPriceX96,
            defaultTick,
            3000  // 0.3% fee
        );
    }

    // ==================== Mint 模糊测试 ====================

    /// @dev 测试 mint 时的 tick 范围验证 - 无效范围应该 revert
    function testFuzz_MintInvalidTickRangeLowerGtUpper(int24 lowerTick, int24 upperTick) public {
        // 约束参数使 lowerTick > upperTick
        lowerTick = int24(bound(lowerTick, MIN_TICK + 1, MAX_TICK - 2));
        upperTick = int24(bound(upperTick, MIN_TICK, lowerTick - 1));

        vm.expectRevert(UniswapV3Pool.InvalidTickRange.selector);
        pool.mint(address(this), lowerTick, upperTick, 1000, "");
    }

    /// @dev 测试有效的 mint 操作
    function testFuzz_MintValidTickRange(int24 lowerTick, int24 upperTick, uint128 amount) public {
        // 约束参数确保是有效范围
        lowerTick = int24(bound(lowerTick, MIN_TICK + 1, MAX_TICK - 100));
        upperTick = int24(bound(upperTick, lowerTick + 1, MAX_TICK - 1));
        amount = uint128(bound(amount, 1, 1e18));

        // 准备资金
        _mintTokensAndApprove(address(this), 1e30 ether, 1e30 ether);

        pool.mint(
            address(this),
            lowerTick,
            upperTick,
            amount,
            abi.encode(UniswapV3Pool.CallbackData({
                token0: address(token0),
                token1: address(token1),
                player: address(this),
                fee: 3000
            }))
        );

        // 验证流动性
        assertEq(pool.liquidity(), amount, "liquidity mismatch");
    }

    /// @dev 测试 zero liquidity 应该 revert
    function testFuzz_MintZeroLiquidity(int24 lowerTick, int24 upperTick) public {
        lowerTick = int24(bound(lowerTick, MIN_TICK, MAX_TICK - 1));
        upperTick = int24(bound(upperTick, lowerTick + 1, MAX_TICK));

        vm.expectRevert(UniswapV3Pool.ZeroLiquidity.selector);
        pool.mint(address(this), lowerTick, upperTick, 0, "");
    }

    // ==================== Swap 模糊测试 ====================

    /// @dev 设置流动性供 swap 测试使用
    function _setupLiquidity(uint128 liquidity) internal {
        int24 lowerTick = 84222;
        int24 upperTick = 86129;

        // 给足够的资金
        _mintTokensAndApprove(address(this), 1e30 ether, 1e30 ether);

        pool.mint(
            address(this),
            lowerTick,
            upperTick,
            liquidity,
            abi.encode(UniswapV3Pool.CallbackData({
                token0: address(token0),
                token1: address(token1),
                player: address(this),
                fee: 3000
            }))
        );
    }

    function _mintTokensAndApprove(address to, uint256 amount0, uint256 amount1) internal {
        token0.mint(to, amount0);
        token1.mint(to, amount1);
        token0.approve(address(pool), type(uint256).max);
        token1.approve(address(pool), type(uint256).max);
    }

    /// @dev 测试 swap 后流动性不变
    function testFuzz_SwapPreservesLiquidity(bool zeroForOne, uint256 amountSpecified) public {
        // 先添加流动性
        uint128 liquidityAmount = 1517882343751509868544;
        _setupLiquidity(liquidityAmount);

        // 约束 swap 金额 - 限制在较小范围内避免输出超过池中余额
        amountSpecified = bound(amountSpecified, 0.01 ether, 1 ether);

        uint128 liquidityBefore = pool.liquidity();

        // 执行 swap
        (int256 amount0Delta, int256 amount1Delta) = pool.swap(
            address(this),
            zeroForOne,
            amountSpecified,
            abi.encode(UniswapV3Pool.CallbackData({
                token0: address(token0),
                token1: address(token1),
                player: address(this),
                fee: 3000
            }))
        );

        // 检查流动性不变
        uint128 liquidityAfter = pool.liquidity();
        assertEq(liquidityBefore, liquidityAfter, "liquidity should not change after swap");

        // 检查 swap 方向
        if (zeroForOne) {
            assertTrue(amount0Delta > 0, "amount0 should be positive (input)");
            assertTrue(amount1Delta < 0, "amount1 should be negative (output)");
        } else {
            assertTrue(amount0Delta < 0, "amount0 should be negative (output)");
            assertTrue(amount1Delta > 0, "amount1 should be positive (input)");
        }
    }

    /// @dev 测试 swap 后价格变化方向
    function testFuzz_SwapPriceDirection(bool zeroForOne, uint256 amountSpecified) public {
        uint128 liquidityAmount = 1517882343751509868544;
        _setupLiquidity(liquidityAmount);

        // 限制在较小范围内
        amountSpecified = bound(amountSpecified, 0.01 ether, 1 ether);

        (uint160 sqrtPriceBefore, ) = pool.slot0();

        pool.swap(
            address(this),
            zeroForOne,
            amountSpecified,
            abi.encode(UniswapV3Pool.CallbackData({
                token0: address(token0),
                token1: address(token1),
                player: address(this),
                fee: 3000
            }))
        );

        (uint160 sqrtPriceAfter, ) = pool.slot0();

        if (zeroForOne) {
            // 用 token0 换 token1，价格下降
            assertLt(sqrtPriceAfter, sqrtPriceBefore, "price should decrease for zeroForOne");
        } else {
            // 用 token1 换 token0，价格上升
            assertGt(sqrtPriceAfter, sqrtPriceBefore, "price should increase for oneForZero");
        }
    }

    /// @dev 测试没有流动性时 swap 应该 revert
    function testFuzz_SwapNoLiquidity(bool zeroForOne, uint256 amountSpecified) public {
        // 不添加流动性
        amountSpecified = bound(amountSpecified, 1, 1e20);

        vm.expectRevert(UniswapV3Pool.NoLiquidity.selector);
        pool.swap(address(this), zeroForOne, amountSpecified, "");
    }

    /// @dev 测试 zero amount 时 swap 应该 revert
    function testFuzz_SwapZeroAmount(bool zeroForOne) public {
        uint128 liquidityAmount = 1517882343751509868544;
        _setupLiquidity(liquidityAmount);

        vm.expectRevert(UniswapV3Pool.InsufficientInputAmount.selector);
        pool.swap(address(this), zeroForOne, 0, "");
    }

    // ==================== 回调函数 ====================

    function uniswapV3MintCallback(
        uint256 amount0,
        uint256 amount1,
        bytes calldata /* data */
    ) external {
        if (amount0 > 0) token0.transfer(address(pool), amount0);
        if (amount1 > 0) token1.transfer(address(pool), amount1);
    }

    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata /* data */
    ) external {
        if (amount0Delta > 0) token0.transfer(address(pool), uint256(amount0Delta));
        if (amount1Delta > 0) token1.transfer(address(pool), uint256(amount1Delta));
    }
}