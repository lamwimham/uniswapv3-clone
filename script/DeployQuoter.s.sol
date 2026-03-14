// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../src/UniswapV3Quoter.sol";

contract DeployQuoter is Script {
    function run() external {
        vm.startBroadcast();

        UniswapV3Quoter quoter = new UniswapV3Quoter();

        console.log("Quoter address", address(quoter));

        vm.stopBroadcast();
    }
}