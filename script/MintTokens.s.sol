// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../test/ERC20Mintable.sol";

contract MintTokens is Script {
    function run() external {
        vm.startBroadcast();

        // 获取已部署的代币合约
        ERC20Mintable weth = ERC20Mintable(0x5FbDB2315678afecb367f032d93F642f64180aa3);
        ERC20Mintable usdc = ERC20Mintable(0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512);

        // 为默认账户铸造代币
        address defaultAccount = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        weth.mint(defaultAccount, 1000 ether);  // 铸造 1000 WETH
        usdc.mint(defaultAccount, 1000000 ether);  // 铸造 1,000,000 USDC

        console.log("Minted tokens to account:", defaultAccount);
        console.log("WETH balance:", weth.balanceOf(defaultAccount));
        console.log("USDC balance:", usdc.balanceOf(defaultAccount));

        vm.stopBroadcast();
    }
}