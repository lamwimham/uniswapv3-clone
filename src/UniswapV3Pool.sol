// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./lib/Tick.sol";
import "./lib/Position.sol";
import "./lib/TickBitmap.sol";
import "./lib/Math.sol";
import "./lib/SwapMath.sol";
import "./lib/TickMath.sol";
import "./interfaces/callback/IUniswapV3MintCallback.sol";
import "./interfaces/callback/IUniswapV3SwapCallback.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract UniswapV3Pool {
    error InvalidTickRange();
    error ZeroLiquidity();
    error InsufficientInputAmount();
    error SwapDeadlineExpired();
    error SwapNotInitialized();

    using Tick for mapping(int24 => Tick.Info);

    using Position for mapping(bytes32 => Position.Info);
    using Position for Position.Info;

    int24 public constant MIN_TICK = -887272;
    int24 public constant MAX_TICK = -MIN_TICK;

    using TickBitmap for mapping(int16 => uint256);
    mapping(int16 => uint256) public tickBitmap;

    // Pool tokens
    address public immutable token0;
    address public immutable token1;
    uint24 public immutable fee;
    int24 public immutable tickSpacing;

    // 定义一个Slot 结构体来存储当前价格的平方根和tick
    struct Slot0 {
        // Current sqrt(price) as a Q64.96 value
        uint160 sqrtPriceX96;
        // Current tick
        int24 tick;
    }

    // 将额外的数据定义为一个结构体
    struct CallbackData {
        address token0;
        address token1;
        address player;
    }

    // 兑换状态（tick）
    struct SwapState {
        int256 amountSpecifiedRemaining; // 剩余的交换数量，当该值为零时，兑换完成
        int256 amountCalculated; // 已经计算的数量
        uint160 sqrtPriceX96; // 当前价格的平方根
        int24 tick; // tick
        uint128 liquidity;
    }

    // 兑换步骤状态
    struct StepState {
        uint160 sqrtPriceStartX96; // 开始价格的平方根
        int24 nextTick; // 下一个tick
        uint160 sqrtPriceNextX96; // 下一个tick的价格的平方根
        uint256 amountIn; // 输入数量
        uint256 amountOut; // 输出数量
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
        uint24 fee_,
        int24 tickSpacing_
    ) {
        token0 = token0_;
        token1 = token1_;
        fee = fee_;
        tickSpacing = tickSpacing_;
        slot0 = Slot0({sqrtPriceX96: sqrtPriceX96_, tick: tick_});
    }

    // 往池子里添加流动性，实际上就是铸造NFT
    function mint(
        address owner, // 流动性提供者的地址
        int24 lowerTick, // 流动性提供者的tickLower
        int24 upperTick, // 流动性提供者的tickUpper
        uint128 amount, // 流动性提供者提供的流动性数量
        bytes calldata data
    ) external returns (uint256 amount0, uint256 amount1) {
        // 数据校验
        if (
            lowerTick >= upperTick ||
            lowerTick < MIN_TICK ||
            upperTick > MAX_TICK
        ) revert InvalidTickRange();

        if (amount == 0) revert ZeroLiquidity();

        // 更新tick和position信息
        ticks.update(lowerTick, amount); // 更新tick信息
        ticks.update(upperTick, amount); // 更新tick信息

        // 更新tick bitmap
        tickBitmap.flipTick(lowerTick, tickSpacing);
        tickBitmap.flipTick(upperTick, tickSpacing);

        Position.Info storage position = positions.get(
            owner,
            lowerTick,
            upperTick
        );

        position.update(amount);

        Slot0 memory slot0_ = slot0;

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

        liquidity += amount; // 增加流动性

        uint256 balance0Before = balance0();
        uint256 balance1Before = balance1();

        IUniswapV3MintCallback(msg.sender).uniswapV3MintCallback(
            amount0,
            amount1,
            data
        );

        if (balance0Before + amount0 > balance0())
            revert InsufficientInputAmount();
        if (balance1Before + amount1 > balance1())
            revert InsufficientInputAmount();

        emit Mint(
            msg.sender,
            owner,
            lowerTick,
            upperTick,
            amount,
            amount0,
            amount1
        );
    }

    function balance0() public view returns (uint256) {
        return IERC20(token0).balanceOf(address(this));
    }

    function balance1() public view returns (uint256) {
        return IERC20(token1).balanceOf(address(this));
    }

    /// @dev 兑换swap
    /// @param recipient 接收输出的地址
    /// @param zeroForOne true 表示用 token0 换 token1
    /// @param amountSpecified 输入金额（正数表示精确输入）
    /// @param data 回调数据
    function swap(
        address recipient,
        bool zeroForOne,
        uint256 amountSpecified,
        bytes calldata data
    ) external returns (int256 amount0, int256 amount1) {

        if (liquidity == 0) revert SwapNotInitialized();
        if (amountSpecified == 0) revert InsufficientInputAmount();

        SwapState memory state = SwapState({
            amountSpecifiedRemaining: int256(amountSpecified),
            amountCalculated: 0,
            sqrtPriceX96: slot0.sqrtPriceX96,
            tick: slot0.tick,
            liquidity: liquidity
        });

        // 限制最大循环次数防止无限循环
        uint256 maxIterations = 100;
        uint256 iteration = 0;

        while (state.amountSpecifiedRemaining > 0 && iteration < maxIterations) {
            iteration++;

            StepState memory step;

            step.sqrtPriceStartX96 = state.sqrtPriceX96;

            // 获取下一个初始化的tick
            (step.nextTick, ) = tickBitmap.nextInitializedTickWithinOneWord(
                state.tick,
                tickSpacing,
                zeroForOne
            );

            // 确保nextTick在有效范围内
            if (zeroForOne) {
                if (step.nextTick < MIN_TICK) step.nextTick = MIN_TICK;
            } else {
                if (step.nextTick > MAX_TICK) step.nextTick = MAX_TICK;
            }

            step.sqrtPriceNextX96 = TickMath.getSqrtRatioAtTick(step.nextTick);

            // 计算这一步可以交换的数量
            (state.sqrtPriceX96, step.amountIn, step.amountOut) = SwapMath
                .computeSwapStep(
                    state.sqrtPriceX96,
                    step.sqrtPriceNextX96,
                    state.liquidity,
                    state.amountSpecifiedRemaining
                );

            // 更新剩余数量
            if (step.amountIn > uint256(state.amountSpecifiedRemaining)) {
                // 如果这一步需要的输入超过了剩余数量，只消耗剩余数量
                step.amountIn = uint256(state.amountSpecifiedRemaining);
                state.amountSpecifiedRemaining = 0;
            } else {
                state.amountSpecifiedRemaining -= int256(step.amountIn);
            }

            state.amountCalculated += int256(step.amountOut);
            state.tick = TickMath.getTickAtSqrtRatio(state.sqrtPriceX96);

            // 如果达到了下一个tick，可能需要跨越到新的流动性区间
            if (state.tick == step.nextTick) {
                // 简化处理：这里不处理跨越tick的流动性更新
                // 在完整实现中，需要更新liquidity
            }
        }

        // 更新全局状态
        if (state.tick != slot0.tick) {
            (slot0.sqrtPriceX96, slot0.tick) = (state.sqrtPriceX96, state.tick);
        }

        // 计算最终的amount0和amount1
        (amount0, amount1) = zeroForOne
            ? (
                int256(amountSpecified) - state.amountSpecifiedRemaining,
                -state.amountCalculated
            )
            : (
                -state.amountCalculated,
                int256(amountSpecified) - state.amountSpecifiedRemaining
            );

        // 执行代币转账
        if (zeroForOne) {
            // 输入token0，输出token1
            if (amount1 < 0) {
                IERC20(token1).transfer(recipient, uint256(-amount1));
            }

            uint256 balance0Before = balance0();
            IUniswapV3SwapCallback(msg.sender).uniswapV3SwapCallback(
                amount0,
                amount1,
                data
            );
            if (balance0Before + uint256(amount0) > balance0())
                revert InsufficientInputAmount();
        } else {
            // 输入token1，输出token0
            if (amount0 < 0) {
                IERC20(token0).transfer(recipient, uint256(-amount0));
            }

            uint256 balance1Before = balance1();
            IUniswapV3SwapCallback(msg.sender).uniswapV3SwapCallback(
                amount0,
                amount1,
                data
            );
            if (balance1Before + uint256(amount1) > balance1())
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

        return (amount0, amount1);
    }
}