// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../test/ERC20Mintable.sol";
import "../src/UniswapV3Pool.sol";
import "../src/UniswapV3Manager.sol";
import "../src/UniswapV3Factory.sol";

/**
 * @title DeploySepolia
 * @notice 部署 Uniswap V3 Clone 到 Sepolia 测试网
 * @dev 包含完整的部署、初始化和添加流动性流程
 */
contract DeploySepolia is Script {
    // 初始价格参数 (1 ETH = 5000 USDC)
    // sqrt(5000) * 2^96 ≈ 5602277097478614198912276234240
    int24 public constant INITIAL_TICK = 85176;
    uint160 public constant INITIAL_SQRT_PRICE_X96 = 5602277097478614198912276234240;

    // 流动性参数
    int24 public constant LOWER_TICK = 84222; // ~4800 USDC per ETH
    int24 public constant UPPER_TICK = 86129; // ~5200 USDC per ETH
    uint128 public constant INITIAL_LIQUIDITY = 1517882343751509868544;

    // 初始铸造数量
    uint256 public constant INITIAL_WETH_MINT = 100 ether;
    uint256 public constant INITIAL_USDC_MINT = 500000 ether;

    // 费率 (3000 = 0.3%)
    uint24 public constant FEE = 3000;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance);

        // ====== 1. 部署测试代币 ======
        console.log("\n--- Deploying Tokens ---");
        ERC20Mintable weth = new ERC20Mintable("Wrapped Ether", "WETH", 18);
        ERC20Mintable usdc = new ERC20Mintable("USD Coin", "USDC", 18);

        console.log("WETH deployed at:", address(weth));
        console.log("USDC deployed at:", address(usdc));

        // 确定 token0 和 token1 (按地址排序)
        (address token0, address token1) = address(weth) < address(usdc)
            ? (address(weth), address(usdc))
            : (address(usdc), address(weth));

        console.log("Token0 (smaller address):", token0);
        console.log("Token1 (larger address):", token1);

        // ====== 2. 部署工厂合约 ======
        console.log("\n--- Deploying Factory ---");
        UniswapV3Factory factory = new UniswapV3Factory();
        console.log("Factory deployed at:", address(factory));

        // ====== 3. 部署池子 (直接部署，设置正确的初始价格) ======
        console.log("\n--- Deploying Pool ---");
        UniswapV3Pool pool = new UniswapV3Pool(
            token0,
            token1,
            INITIAL_SQRT_PRICE_X96,
            INITIAL_TICK
        );
        console.log("Pool deployed at:", address(pool));
        console.log("Pool sqrtPriceX96:", INITIAL_SQRT_PRICE_X96);
        console.log("Pool tick:", INITIAL_TICK);

        // ====== 4. 部署管理器 ======
        console.log("\n--- Deploying Manager ---");
        UniswapV3Manager manager = new UniswapV3Manager();
        console.log("Manager deployed at:", address(manager));

        // ====== 5. 铸造测试代币 ======
        console.log("\n--- Minting Test Tokens ---");
        weth.mint(deployer, INITIAL_WETH_MINT);
        usdc.mint(deployer, INITIAL_USDC_MINT);
        console.log("Minted", INITIAL_WETH_MINT, "WETH to deployer");
        console.log("Minted", INITIAL_USDC_MINT, "USDC to deployer");

        // ====== 6. 授权代币给管理器 ======
        console.log("\n--- Approving Tokens ---");
        weth.approve(address(manager), type(uint256).max);
        usdc.approve(address(manager), type(uint256).max);
        console.log("Approved WETH and USDC to Manager");

        // ====== 7. 添加初始流动性 ======
        console.log("\n--- Adding Initial Liquidity ---");
        bytes memory callbackData = abi.encode(
            UniswapV3Pool.CallbackData({
                token0: token0,
                token1: token1,
                player: deployer
            })
        );

        manager.mint(address(pool), LOWER_TICK, UPPER_TICK, INITIAL_LIQUIDITY, callbackData);
        console.log("Added liquidity:", INITIAL_LIQUIDITY);
        console.log("Lower tick:", LOWER_TICK);
        console.log("Upper tick:", UPPER_TICK);

        // ====== 8. 验证部署 ======
        console.log("\n--- Verifying Deployment ---");
        (uint160 sqrtPriceX96, int24 tick) = pool.slot0();
        uint128 poolLiquidity = pool.liquidity();

        console.log("Pool sqrtPriceX96:", sqrtPriceX96);
        console.log("Pool tick:", tick);
        console.log("Pool liquidity:", poolLiquidity);

        vm.stopBroadcast();

        // ====== 9. 输出部署摘要 ======
        console.log("\n========================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("========================================");
        console.log("WETH:", address(weth));
        console.log("USDC:", address(usdc));
        console.log("Factory:", address(factory));
        console.log("Pool:", address(pool));
        console.log("Manager:", address(manager));
        console.log("========================================");
        console.log("\nUpdate frontend/src/contracts/addresses.ts with:");
        console.log("  WETH:", address(weth));
        console.log("  USDC:", address(usdc));
        console.log("  Factory:", address(factory));
        console.log("  Manager:", address(manager));
        console.log("========================================");
    }
}