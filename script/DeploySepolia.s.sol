// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../src/UniswapV3Pool.sol";
import "../src/UniswapV3Manager.sol";
import "../src/UniswapV3Factory.sol";
import "../src/UniswapV3Quoter.sol";

contract DeploySepolia is Script {
    // 已部署的代币地址（Sepolia）
    address constant WETH = 0xb7f9c55C8789107B52f400bCDB151a562f355977;
    address constant USDC = 0xCBb50DC59f9A67E99DD216651acCaedba56Ee625;

    function run() external {
        vm.startBroadcast();

        // 1. 部署新工厂合约
        UniswapV3Factory factory = new UniswapV3Factory();
        console.log("Factory address:", address(factory));

        // 2. 使用工厂创建新池子 (USDC < WETH by address, so token0=USDC, token1=WETH)
        address pool = factory.createPool(USDC, WETH, 3000);
        console.log("Pool address:", pool);

        // 3. 部署新管理器
        UniswapV3Manager manager = new UniswapV3Manager();
        console.log("Manager address:", address(manager));

        // 4. 部署新 Quoter
        UniswapV3Quoter quoter = new UniswapV3Quoter();
        console.log("Quoter address:", address(quoter));

        // 5. 打印所有地址
        console.log("\n=== Deployed Contracts ===");
        console.log("WETH:", WETH);
        console.log("USDC:", USDC);
        console.log("Factory:", address(factory));
        console.log("Pool:", pool);
        console.log("Manager:", address(manager));
        console.log("Quoter:", address(quoter));

        vm.stopBroadcast();
    }
}