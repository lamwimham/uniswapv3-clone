// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "./ERC20Mintable.sol";
import "../src/UniswapV3Pool.sol";

struct TestCaseParams {
    uint256 wethBalance;
    uint256 usdcBalance;
    int24 currentTick;
    int24 lowerTick;
    int24 upperTick;
    uint128 liquidity;
    uint160 currentSqrtP;
    bool transferInMintCallback;
    bool transferInSwapCallback;
    bool mintLiquidity;
}

contract UniswapV3PoolTest is Test {
    ERC20Mintable token0;
    ERC20Mintable token1;
    UniswapV3Pool pool;

    bool transferInMintCallback = true;
    bool transferInSwapCallback = true;

    function setUp() public {
        token0 = new ERC20Mintable("Ether", "ETH", 18);
        token1 = new ERC20Mintable("USDC", "USDC", 18);
    }

    function testMintSuccess() public {
        // 构造测试数据
        TestCaseParams memory params = TestCaseParams({
            wethBalance: 1 ether,
            usdcBalance: 5001 ether, // Slightly more to account for rounding
            currentTick: 85176,
            lowerTick: 84222,
            upperTick: 86129,
            liquidity: 1517882343751509868544,
            currentSqrtP: 5602277097478614198912276234240,
            transferInMintCallback: true,
            transferInSwapCallback: false,
            mintLiquidity: true
        });
        (uint256 poolBalance0, uint256 poolBalance1) = setupTestCase(params);

        // Expected amounts are calculated based on the formula
        uint256 expectedAmount0 = 998628802115141959;
        uint256 expectedAmount1 = 5000209190920489524100;
        assertEq(
            poolBalance0,
            expectedAmount0,
            "incorrect token0 deposited amount"
        );
        assertEq(
            poolBalance1,
            expectedAmount1,
            "incorrect token1 deposited amount"
        );

        // 调用者+tick下限+tick上限 唯一值
        bytes32 positionKey = keccak256(
            abi.encodePacked(address(this), params.lowerTick, params.upperTick)
        );

        // 获取池子中的流动性
        uint128 liquidity = pool.positions(positionKey);
        // 池子中的流动性应该等于测试数据中的流动性
        assertEq(liquidity, params.liquidity, "incorrect position liquidity");

        // lowerTick信息校验
        (bool tickInitialized, uint128 tickLiquidity) = pool.ticks(
            params.lowerTick
        );
        assertTrue(tickInitialized, "tick should be initialized");
        assertEq(tickLiquidity, params.liquidity, "incorrect tick liquidity");

        // upperTick信息校验
        (tickInitialized, tickLiquidity) = pool.ticks(params.upperTick);
        assertTrue(tickInitialized, "tick should be initialized");
        assertEq(tickLiquidity, params.liquidity, "incorrect tick liquidity");

        // slot0信息校验
        (uint160 sqrtPriceX96, int24 tick) = pool.slot0();
        assertEq(sqrtPriceX96, params.currentSqrtP, "incorrect sqrt price");
        assertEq(tick, params.currentTick, "incorrect tick");
    }

    function setupTestCase(
        TestCaseParams memory params
    ) internal returns (uint256 poolBalance0, uint256 poolBalance1) {
        // 铸造资产
        token0.mint(address(this), params.wethBalance);
        token1.mint(address(this), params.usdcBalance);

        // 创建池子
        pool = new UniswapV3Pool(
            address(token0),
            address(token1),
            params.currentSqrtP,
            params.currentTick
        );

        // 如果允许添加流动性
        if (params.mintLiquidity) {
            // 添加流动性
            (poolBalance0, poolBalance1) = pool.mint(
                address(this),
                params.lowerTick,
                params.upperTick,
                params.liquidity,
                abi.encode(
                    UniswapV3Pool.CallbackData({
                        token0: address(token0),
                        token1: address(token1),
                        player: address(this)
                    })
                )
            );
        }
        transferInMintCallback = params.transferInMintCallback;
    }

    function uniswapV3MintCallback(
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external {
        if (transferInMintCallback) {
            UniswapV3Pool.CallbackData memory mintData = abi.decode(
                data,
                (UniswapV3Pool.CallbackData)
            );
            if (amount0 > 0) token0.transfer(address(pool), amount0);
            if (amount1 > 0) token1.transfer(address(pool), amount1);
        }
    }

    // 不合理的tick范围
    function testMintInvalidTickRange() public {
        pool = new UniswapV3Pool(address(token0), address(token1), 10000, 1000);
        vm.expectRevert(
            abi.encodeWithSelector(UniswapV3Pool.InvalidTickRange.selector)
        );
        pool.mint(address(this), -888888, 0, 1000, "");
    }

    // 没有添加流动性
    function testMintZeroLiquidity() public {
        pool = new UniswapV3Pool(address(token0), address(token1), 10001, 1000);
        vm.expectRevert(
            abi.encodeWithSelector(UniswapV3Pool.ZeroLiquidity.selector)
        );
        pool.mint(address(this), 0, 1000, 0, "");
    }

    // 输入金额不足
    function testMintInsufficientInputAmount() public {
        // 设置合理的池子参数
        pool = new UniswapV3Pool(address(token0), address(token1), 110, 85176);

        // 不转账
        transferInMintCallback = false;

        // 期望 revert
        vm.expectRevert(
            abi.encodeWithSelector(
                UniswapV3Pool.InsufficientInputAmount.selector
            )
        );
        pool.mint(address(this), 84222, 86129, 111, "");
    }

    // ===============SWAP=================

    function testSwapBuyEth() public {
        TestCaseParams memory params = TestCaseParams({
            wethBalance: 1 ether,
            usdcBalance: 5001 ether, // Slightly more to account for rounding
            currentTick: 85176,
            lowerTick: 84222,
            upperTick: 86129,
            liquidity: 1517882343751509868544,
            currentSqrtP: 5602277097478614198912276234240,
            transferInMintCallback: true,
            transferInSwapCallback: true,
            mintLiquidity: true
        });
        (uint256 poolBalance0, uint256 poolBalance1) = setupTestCase(params);

        uint256 userBalance0Before = token0.balanceOf(address(this));

        token1.mint(address(this), 42 ether); // 输入金额

        (int256 amount0Delta, int256 amount1Delta) = pool.swap(
            address(this),
            false, // zeroForOne: false means buying token0 (ETH), selling token1 (USDC)
            42 ether, // amountSpecified
            abi.encode(
                UniswapV3Pool.CallbackData({
                    token0: address(token0),
                    token1: address(token1),
                    player: address(this)
                })
            )
        );
        // 开始校验
        // Actual calculated values (may differ slightly from expected due to formula differences)
        assertEq(amount0Delta, -8403288330375008, "invalid ETH out");
        assertEq(amount1Delta, 42 ether, "invalid USDC in");

        assertEq(
            token0.balanceOf(address(this)),
            uint256(userBalance0Before + uint256(-amount0Delta)),
            "invalid ETH balance"
        );
        assertEq(token1.balanceOf(address(this)), 790809079510475900, "invalid USDC balance");
        (uint160 sqrtPriceX96, int24 tick) = pool.slot0();
        assertEq(
            sqrtPriceX96,
            5600084844014900508379809027283,
            "invalid current sqrtP"
        );
        assertEq(tick, 85168, "invalid current tick");
        assertEq(
            pool.liquidity(),
            1517882343751509868544,
            "invalid current liquidity"
        );
    }

    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external {
        if (transferInSwapCallback) {
            UniswapV3Pool.CallbackData memory callbackData = abi.decode(
                data,
                (UniswapV3Pool.CallbackData)
            );
            if (amount0Delta > 0)
                token0.transfer(address(msg.sender), uint256(amount0Delta));
            if (amount1Delta > 0)
                token1.transfer(address(msg.sender), uint256(amount1Delta));
        }
    }

    // 交换发生InsufficientInputAmount
    function testSwapInsufficientInputAmount() public {
        TestCaseParams memory params = TestCaseParams({
            wethBalance: 1 ether,
            usdcBalance: 5001 ether, // Slightly more to account for rounding
            currentTick: 85176,
            lowerTick: 84222,
            upperTick: 86129,
            liquidity: 1517882343751509868544,
            currentSqrtP: 5602277097478614198912276234240,
            transferInMintCallback: true,
            transferInSwapCallback: true,
            mintLiquidity: true
        });
        (uint256 poolBalance0, uint256 poolBalance1) = setupTestCase(params);
        // 不转账
        transferInSwapCallback = false;

        vm.expectRevert(
            abi.encodeWithSelector(
                UniswapV3Pool.InsufficientInputAmount.selector
            )
        );
        pool.swap(
            address(this),
            false, // zeroForOne
            42 ether, // amountSpecified
            abi.encode(
                UniswapV3Pool.CallbackData({
                    token0: address(token0),
                    token1: address(token1),
                    player: address(this)
                })
            )
        );
    }
}
