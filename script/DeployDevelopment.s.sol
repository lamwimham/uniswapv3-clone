// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../test/ERC20Mintable.sol";
import "../src/UniswapV3Pool.sol";
import "../src/UniswapV3Manager.sol";
import "../src/UniswapV3Factory.sol";

contract DeployDevelopment is Script {
    function run() external {
        vm.startBroadcast();

        // 部署代币
        ERC20Mintable token0 = new ERC20Mintable("Wrapped Ether", "WETH", 18);
        ERC20Mintable token1 = new ERC20Mintable("USD Coin", "USDC", 18);

        // 部署工厂合约
        UniswapV3Factory factory = new UniswapV3Factory();

        // 使用工厂创建池子
        address pool = factory.createPool(address(token0), address(token1), 3000);

        // 部署管理器
        UniswapV3Manager manager = new UniswapV3Manager(address(factory));

        console.log("WETH address", address(token0));
        console.log("USDC address", address(token1));
        console.log("Factory address", address(factory));
        console.log("Pool address", pool);
        console.log("Manager address", address(manager));

        vm.stopBroadcast();
    }
}
