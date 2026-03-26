// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../test/ERC20Mintable.sol";
import "../src/UniswapV3Pool.sol";
import "../src/UniswapV3Manager.sol";

contract AddLiquidity is Script {
    // 新部署的合约地址
    address constant POOL = 0x461617E76b03A2d9E1a3DBDbE46f54a35c62edC8;
    address constant MANAGER = 0x2b6a6Ea12439f59cdB174681FB5bB3Db16AAcE96;
    
    // 代币地址
    address constant USDC = 0xCBb50DC59f9A67E99DD216651acCaedba56Ee625;
    address constant WETH = 0xb7f9c55C8789107B52f400bCDB151a562f355977;

    function run() external {
        vm.startBroadcast();

        // Mint 代币给用户
        ERC20Mintable(USDC).mint(msg.sender, 1000e18);
        ERC20Mintable(WETH).mint(msg.sender, 1000e18);

        // Approve Manager
        ERC20Mintable(USDC).approve(MANAGER, type(uint256).max);
        ERC20Mintable(WETH).approve(MANAGER, type(uint256).max);

        // 准备回调数据
        UniswapV3Pool.CallbackData memory data = UniswapV3Pool.CallbackData({
            token0: USDC,
            token1: WETH,
            player: msg.sender,
            fee: 3000  // 0.3%
        });
        bytes memory encodedData = abi.encode(data);

        // 添加流动性 (tick 范围: -887220 到 887220, 流动性: 100e18)
        UniswapV3Manager(MANAGER).mint(
            POOL,
            -887220,
            887220,
            100e18,
            encodedData
        );

        console.log("Liquidity added successfully!");

        vm.stopBroadcast();
    }
}