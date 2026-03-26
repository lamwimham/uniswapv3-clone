// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../test/ERC20Mintable.sol";
import "../src/UniswapV3Pool.sol";
import "../src/UniswapV3Manager.sol";

contract InitializePool is Script {
    // 已部署的合约地址（Sepolia）
    address constant WETH = 0xb7f9c55C8789107B52f400bCDB151a562f355977;
    address constant USDC = 0xCBb50DC59f9A67E99DD216651acCaedba56Ee625;
    address constant MANAGER = 0x6e5A9Fb05Bfaa2de92745336fA999B07924aE2d0;

    // 池子地址（WETH/USDC 0.3%）
    // 根据地址排序：USDC < WETH，所以 token0 = USDC, token1 = WETH
    address constant POOL = 0xb5fAD4ff7D1B7463200C650F50854A0D9E6f9551;

    function run() external {
        vm.startBroadcast();

        ERC20Mintable weth = ERC20Mintable(WETH);
        ERC20Mintable usdc = ERC20Mintable(USDC);
        UniswapV3Manager manager = UniswapV3Manager(MANAGER);

        // 1. 铸造代币给部署者
        uint256 wethAmount = 10 ether;     // 10 WETH
        uint256 usdcAmount = 20000 ether;  // 20,000 USDC

        weth.mint(msg.sender, wethAmount);
        usdc.mint(msg.sender, usdcAmount);

        console.log("Minted tokens:");
        console.log("  WETH balance:", weth.balanceOf(msg.sender));
        console.log("  USDC balance:", usdc.balanceOf(msg.sender));

        // 2. 授权 Manager 合约
        weth.approve(MANAGER, type(uint256).max);
        usdc.approve(MANAGER, type(uint256).max);
        console.log("Approved Manager for both tokens");

        // 3. 添加流动性
        // 池子初始价格 = 1，tick = 0
        // 使用更大的流动性，价格区间设置为 [-1000, 1000]（约 ±10%）
        int24 lowerTick = -1000;
        int24 upperTick = 1000;
        uint128 liquidity = 100000000000000000000; // 更大的流动性

        bytes memory callbackData = abi.encode(
            UniswapV3Pool.CallbackData({
                token0: USDC,  // USDC 地址更小，是 token0
                token1: WETH,
                player: msg.sender,
                fee: 3000  // 0.3%
            })
        );

        manager.mint(
            POOL,
            lowerTick,
            upperTick,
            liquidity,
            callbackData
        );

        console.log("Added liquidity successfully!");

        // 检查池子状态
        (uint160 sqrtPriceX96, int24 tick) = UniswapV3Pool(POOL).slot0();
        uint128 poolLiquidity = UniswapV3Pool(POOL).liquidity();

        console.log("Pool state after adding liquidity:");
        console.log("  sqrtPriceX96:", sqrtPriceX96);
        console.log("  tick:", tick);
        console.log("  liquidity:", poolLiquidity);

        vm.stopBroadcast();
    }
}