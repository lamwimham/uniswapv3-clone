// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.30;

import "./UniswapV3Pool.sol";

contract UniswapV3Factory {
    // 存储token对的池子地址
    mapping(address => mapping(address => mapping(uint24 => address))) public getPool;
    
    // 事件：当新的池子被创建时触发
    event PoolCreated(
        address indexed token0,
        address indexed token1,
        uint24 indexed fee,
        address pool
    );

    // 创建新池子
    function createPool(
        address token0,
        address token1,
        uint24 fee
    ) external returns (address pool) {
        
        require(token0 != token1, "IdenticalAddresses");
        (address tokenA, address tokenB) = token0 < token1 ? (token0, token1) : (token1, token0);
        require(tokenA != address(0), "ZeroAddress");
        require(getPool[tokenA][tokenB][fee] == address(0), "PoolAlreadyExists");
        
        // 计算池子的初始tick和sqrtPrice
        int24 currentTick = 0;
        uint160 currentSqrtP = 79228162514264337593543950336; // sqrt(1.0001^0) * 2^96
        
        // 部署新池子
        pool = address(new UniswapV3Pool(tokenA, tokenB, currentSqrtP, currentTick));
        
        // 更新存储中的池子地址映射
        getPool[tokenA][tokenB][fee] = pool;
        getPool[tokenB][tokenA][fee] = pool; // pool[token0][token1][fee] = pool
        
        // 触发事件
        emit PoolCreated(token0, token1, fee, pool);
    }
}