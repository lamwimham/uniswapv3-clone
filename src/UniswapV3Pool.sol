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
        uint256 amountCalculated; // 已经计算的数量
        uint160 sqrtPriceX96; // 当前价格的平方根
        int24 tick; // tick
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
        int24 tick_
    ) {
        token0 = token0_;
        token1 = token1_;
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

        Position.Info storage position = positions.get(
            owner,
            lowerTick,
            upperTick
        );

        position.update(amount);
        // amount0 = 0.998976618347425280 ether; // TODO: 硬编码，后续动态计算
        // amount1 = 5000 ether; // TODO: 硬编码,后续动态计算

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

        uint256 balance0Before;
        uint256 balance1Before;

        if (amount0 > 0) balance0Before = balance0(); // 获取token0的余额
        if (amount1 > 0) balance1Before = balance1(); // 获取token1的余额
        IUniswapV3MintCallback(msg.sender).uniswapV3MintCallback(
            amount0,
            amount1,
            data
        );

        if (amount0 > 0 && balance0Before + amount0 > balance0())
            revert InsufficientInputAmount();
        if (amount1 > 0 && balance1Before + amount1 > balance1())
            revert InsufficientInputAmount();

        bool flippedLower = ticks.update(lowerTick, amount);

        bool flippedUpper = ticks.update(upperTick, amount);

        if (flippedLower) {
            tickBitmap.flipTick(lowerTick, 1);
        }
        if (flippedUpper) {
            tickBitmap.flipTick(upperTick, 1);
        }
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

    /**
     * @dev 获取池子中的token0余额
     */
    function balance0() public view returns (uint256) {
        return IERC20(token0).balanceOf(address(this));
    }

    /**
     * @dev 获取池子中的token1余额
     */
    function balance1() public view returns (uint256) {
        return IERC20(token1).balanceOf(address(this));
    }

    // 兑换swap
    /// @dev 兑换swap

    function swap(
        address recipient,
        bool zeroForOne, // 输入代币为true，输出代币为false
        uint256 amountSpecified, // 兑换数量，可以是输入数量也可以是输出数量，取决于amountSpecified的正负, 正认为输入数量，负为输出数量
        bytes calldata data
    ) public returns (int256 amount0, int256 amount1) {

        SwapState memory state = SwapState({
            amountSpecifiedRemaining: int256(amountSpecified),
            amountCalculated: 0,
            sqrtPriceX96: slot0.sqrtPriceX96, // 当前价格的平方根
            tick: slot0.tick // 当前tick
        });

        // 循环执行，指导amountSpecifiedRemaining为0，或者价格达到边界
        while (state.amountSpecifiedRemaining != 0) {
            StepState memory step;

            step.sqrtPriceStartX96 = state.sqrtPriceX96;
            (step.nextTick, ) = tickBitmap
                .nextInitializedTickWithinOneWord(state.tick, 1, zeroForOne);

            step.sqrtPriceNextX96 = TickMath.getSqrtRatioAtTick(step.nextTick);

            (state.sqrtPriceX96, step.amountIn, step.amountOut) = SwapMath
                .computeSwapStep(
                    state.sqrtPriceX96,
                    step.sqrtPriceNextX96,
                    liquidity,
                    state.amountSpecifiedRemaining
                );

            state.amountSpecifiedRemaining -= int256(step.amountIn); // 更新剩余的交换数量
            state.amountCalculated += step.amountOut; // 更新已经计算的数量
            state.tick = TickMath.getTickAtSqrtRatio(state.sqrtPriceX96); // 根据当前sqrtPriceX96计算tick
        }

        if (state.tick != slot0.tick) {
            (slot0.sqrtPriceX96, slot0.tick) = (state.sqrtPriceX96, state.tick);
        }

        (amount0, amount1) = zeroForOne
            ? (
                int256(amountSpecified) - state.amountSpecifiedRemaining,
                -int256(state.amountCalculated)
            )
            : (
                -int256(state.amountCalculated),
                int256(amountSpecified) - state.amountSpecifiedRemaining
            );

        if (zeroForOne) {
            IERC20(token1).transfer(recipient, uint256(-amount1));

            uint256 balance0Before = balance0();
            IUniswapV3SwapCallback(msg.sender).uniswapV3SwapCallback(
                amount0,
                amount1,
                data
            );
            if (balance0Before + uint256(amount0) > balance0())
                revert InsufficientInputAmount();
        } else {
            IERC20(token0).transfer(recipient, uint256(-amount0));

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
