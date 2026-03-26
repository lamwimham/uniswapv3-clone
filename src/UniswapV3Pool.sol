// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./lib/Tick.sol";
import "./lib/Position.sol";
import "./lib/TickBitmap.sol";
import "./lib/Math.sol";
import "./lib/TickMath.sol";
import "./interfaces/callback/IUniswapV3MintCallback.sol";
import "./interfaces/callback/IUniswapV3SwapCallback.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract UniswapV3Pool {
    error InvalidTickRange();
    error ZeroLiquidity();
    error InsufficientInputAmount();
    error NoLiquidity();

    using Tick for mapping(int24 => Tick.Info);
    using Position for mapping(bytes32 => Position.Info);
    using Position for Position.Info;
    using TickBitmap for mapping(int16 => uint256);

    int24 public constant MIN_TICK = -887272;
    int24 public constant MAX_TICK = -MIN_TICK;

    mapping(int16 => uint256) public tickBitmap;

    address public immutable token0;
    address public immutable token1;
    uint24 public immutable fee;

    struct Slot0 {
        uint160 sqrtPriceX96;
        int24 tick;
    }

    struct CallbackData {
        address token0;
        address token1;
        address player;
        uint24 fee;
    }

    Slot0 public slot0;
    uint128 public liquidity;

    mapping(int24 => Tick.Info) public ticks;
    mapping(bytes32 => Position.Info) public positions;

    event Mint(
        address sender,
        address indexed owner,
        int24 indexed tickLower,
        int24 indexed tickUpper,
        uint128 amount,
        uint256 amount0,
        uint256 amount1
    );

    event Swap(
        address indexed sender,
        address indexed recipient,
        int256 amount0,
        int256 amount1,
        uint256 sqrtPriceX96,
        uint128 liquidity,
        int24 tick
    );

    constructor(
        address token0_,
        address token1_,
        uint160 sqrtPriceX96_,
        int24 tick_,
        uint24 fee_
    ) {
        token0 = token0_;
        token1 = token1_;
        fee = fee_;
        slot0 = Slot0({sqrtPriceX96: sqrtPriceX96_, tick: tick_});
    }

    function mint(
        address owner,
        int24 lowerTick,
        int24 upperTick,
        uint128 amount,
        bytes calldata data
    ) external returns (uint256 amount0, uint256 amount1) {
        if (lowerTick >= upperTick || lowerTick < MIN_TICK || upperTick > MAX_TICK)
            revert InvalidTickRange();
        if (amount == 0) revert ZeroLiquidity();

        Position.Info storage position = positions.get(owner, lowerTick, upperTick);
        position.update(amount);

        Slot0 memory slot0_ = slot0;

        // 根据当前价格与 tick 范围的关系计算 amount0 和 amount1
        if (slot0_.tick < lowerTick) {
            // 当前价格 < lowerTick: 只需要 token0
            amount0 = Math.calcAmount0Delta(
                TickMath.getSqrtRatioAtTick(lowerTick),
                TickMath.getSqrtRatioAtTick(upperTick),
                amount
            );
            amount1 = 0;
        } else if (slot0_.tick >= upperTick) {
            // 当前价格 >= upperTick: 只需要 token1
            amount0 = 0;
            amount1 = Math.calcAmount1Delta(
                TickMath.getSqrtRatioAtTick(lowerTick),
                TickMath.getSqrtRatioAtTick(upperTick),
                amount
            );
        } else {
            // 当前价格在范围内: 需要两种 token
            amount0 = Math.calcAmount0Delta(
                slot0_.sqrtPriceX96,
                TickMath.getSqrtRatioAtTick(upperTick),
                amount
            );
            amount1 = Math.calcAmount1Delta(
                slot0_.sqrtPriceX96,
                TickMath.getSqrtRatioAtTick(lowerTick),
                amount
            );
        }

        liquidity += amount;

        uint256 balance0Before = balance0();
        uint256 balance1Before = balance1();

        IUniswapV3MintCallback(msg.sender).uniswapV3MintCallback(amount0, amount1, data);

        if (amount0 > 0 && balance0Before + amount0 > balance0())
            revert InsufficientInputAmount();
        if (amount1 > 0 && balance1Before + amount1 > balance1())
            revert InsufficientInputAmount();

        bool flippedLower = ticks.update(lowerTick, amount);
        bool flippedUpper = ticks.update(upperTick, amount);

        if (flippedLower) tickBitmap.flipTick(lowerTick, 1);
        if (flippedUpper) tickBitmap.flipTick(upperTick, 1);

        emit Mint(msg.sender, owner, lowerTick, upperTick, amount, amount0, amount1);
    }

    function balance0() public view returns (uint256) {
        return IERC20(token0).balanceOf(address(this));
    }

    function balance1() public view returns (uint256) {
        return IERC20(token1).balanceOf(address(this));
    }

    /// @notice 执行代币交换
    /// @param recipient 接收输出代币的地址
    /// @param zeroForOne true 表示用 token0 换 token1
    /// @param amountSpecified 输入金额
    /// @param data 回调数据
    function swap(
        address recipient,
        bool zeroForOne,
        uint256 amountSpecified,
        bytes calldata data
    ) external returns (int256 amount0, int256 amount1) {
        if (liquidity == 0) revert NoLiquidity();
        if (amountSpecified == 0) revert InsufficientInputAmount();

        uint160 sqrtPriceX96Before = slot0.sqrtPriceX96;

        // 计算新的 sqrtPrice
        uint160 sqrtPriceX96After = Math.getNextSqrtPriceFromInput(
            sqrtPriceX96Before,
            liquidity,
            int256(amountSpecified),
            zeroForOne
        );

        // 计算输出金额
        uint256 amountOut;
        if (zeroForOne) {
            // 用 token0 换 token1，输出 token1
            amountOut = Math.calcAmount1Delta(sqrtPriceX96Before, sqrtPriceX96After, liquidity);
        } else {
            // 用 token1 换 token0，输出 token0
            amountOut = Math.calcAmount0Delta(sqrtPriceX96Before, sqrtPriceX96After, liquidity);
        }

        // 确保输出金额不为零
        if (amountOut == 0) revert InsufficientInputAmount();

        // 更新价格
        slot0.sqrtPriceX96 = sqrtPriceX96After;
        slot0.tick = TickMath.getTickAtSqrtRatio(sqrtPriceX96After);

        // 设置返回值
        if (zeroForOne) {
            amount0 = int256(amountSpecified);
            amount1 = -int256(amountOut);
        } else {
            amount0 = -int256(amountOut);
            amount1 = int256(amountSpecified);
        }

        // 执行转账和回调
        if (zeroForOne) {
            // 输出 token1
            IERC20(token1).transfer(recipient, amountOut);

            uint256 balance0Before = balance0();
            IUniswapV3SwapCallback(msg.sender).uniswapV3SwapCallback(amount0, amount1, data);
            if (balance0Before + amountSpecified > balance0())
                revert InsufficientInputAmount();
        } else {
            // 输出 token0
            IERC20(token0).transfer(recipient, amountOut);

            uint256 balance1Before = balance1();
            IUniswapV3SwapCallback(msg.sender).uniswapV3SwapCallback(amount0, amount1, data);
            if (balance1Before + amountSpecified > balance1())
                revert InsufficientInputAmount();
        }

        emit Swap(
            msg.sender,
            recipient,
            amount0,
            amount1,
            slot0.sqrtPriceX96,
            liquidity,
            slot0.tick
        );
    }
}