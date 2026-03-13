#!/usr/bin/env node

const { createPublicClient, http, parseAbi } = require('viem');
const { anvil } = require('viem/chains');

// 创建公共客户端连接到本地节点
const publicClient = createPublicClient({
  chain: anvil,
  transport: http('http://localhost:8546'),
});

// Pool ABI
const poolAbi = parseAbi([
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function liquidity() view returns (uint128)",
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint160 observationIndex, uint160 observationCardinality, uint160 observationCardinalityNext, bool unlocked)",
  "function balanceOf(address owner) view returns (uint256)"
]);

async function checkPoolState() {
  const poolAddress = '0x75537828f2ce51be7289709686a69cbfdbb714f1';
  
  try {
    console.log('检查池子状态...');
    console.log(`池子地址: ${poolAddress}`);
    
    // 检查 token0
    const token0 = await publicClient.readContract({
      address: poolAddress,
      abi: poolAbi,
      functionName: 'token0',
    });
    console.log(`Token0: ${token0}`);
    
    // 检查 token1
    const token1 = await publicClient.readContract({
      address: poolAddress,
      abi: poolAbi,
      functionName: 'token1',
    });
    console.log(`Token1: ${token1}`);
    
    // 检查流动性
    const liquidity = await publicClient.readContract({
      address: poolAddress,
      abi: poolAbi,
      functionName: 'liquidity',
    });
    console.log(`流动性: ${liquidity}`);
    
    // 检查 slot0
    try {
      const slot0 = await publicClient.readContract({
        address: poolAddress,
        abi: poolAbi,
        functionName: 'slot0',
      });
      console.log(`Slot0: sqrtPriceX96=${slot0[0]}, tick=${slot0[1]}, observationIndex=${slot0[2]}, observationCardinality=${slot0[3]}, observationCardinalityNext=${slot0[4]}, unlocked=${slot0[5]}`);
    } catch (error) {
      console.log(`无法读取 slot0: ${error.message}`);
    }
    
  } catch (error) {
    console.error('检查池子状态时出错:', error);
  }
}

checkPoolState();