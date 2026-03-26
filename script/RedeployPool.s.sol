// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../test/ERC20Mintable.sol";
import "../src/UniswapV3Pool.sol";
import "../src/UniswapV3Manager.sol";
import "../src/UniswapV3Factory.sol";

contract RedeployPool is Script {
    // 已有的代币地址 (Sepolia)
    address constant WETH = 0xb7f9c55C8789107B52f400bCDB151a562f355977;
    address constant USDC = 0xCBb50DC59f9A67E99DD216651acCaedba56Ee625;

    function run() external {
        vm.startBroadcast();

        // 部署新的工厂合约
        UniswapV3Factory factory = new UniswapV3Factory();
        console.log("New Factory address", address(factory));

        // 使用新工厂创建池子
        address pool = factory.createPool(USDC, WETH, 3000);
        console.log("New Pool address", pool);

        // 部署新的管理器
        UniswapV3Manager manager = new UniswapV3Manager(address(factory));
        console.log("New Manager address", address(manager));

        vm.stopBroadcast();
    }
}