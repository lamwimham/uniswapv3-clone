import { Address } from 'viem'

// 池子信息
export interface PoolInfo {
  token0: Address
  token1: Address
  fee: number
  pool: Address
}

// 合约地址配置
// 部署后更新这些地址
export const CONTRACTS: Record<number, {
  WETH: Address
  USDC: Address
  Factory: Address
  Manager: Address
  Quoter: Address
  // 已知的池子列表（避免事件查询限制）
  pools?: PoolInfo[]
}> = {
  // 本地开发链 (Anvil) - 部署后更新
  31337: {
    WETH: '0x4A679253410272dd5232B3Ff7cF5dbB88f295319' as Address,
    USDC: '0x7a2088a1bFc9d81c55368AE168C2C02570cB814F' as Address,
    Factory: '0x09635F643e140090A9A8Dcd712eD6285858ceBef' as Address,
    Manager: '0x67d269191c92Caf3cD7723F116c85e6E9bf55933' as Address,
    Quoter: '0x0000000000000000000000000000000000000000' as Address,
  },
  // Sepolia 测试网
  11155111: {
    WETH: '0xb7f9c55C8789107B52f400bCDB151a562f355977' as Address,
    USDC: '0xCBb50DC59f9A67E99DD216651acCaedba56Ee625' as Address,
    Factory: '0xb0186Aa717a2073dbfE3d3cDD7426095ffE3957b' as Address,
    Manager: '0x6e5A9Fb05Bfaa2de92745336fA999B07924aE2d0' as Address,
    Quoter: '0x0000000000000000000000000000000000000000' as Address,
    // 已知的池子（USDC/WETH 0.3%）
    pools: [
      {
        token0: '0xCBb50DC59f9A67E99DD216651acCaedba56Ee625' as Address, // USDC (地址较小)
        token1: '0xb7f9c55C8789107B52f400bCDB151a562f355977' as Address, // WETH
        fee: 3000,
        pool: '0xb5fAD4ff7D1B7463200C650F50854A0D9E6f9551' as Address,
      }
    ],
  },
}

// 代币符号映射
export const TOKEN_SYMBOLS: Record<Address, string> = {
  // 本地测试代币
  ['0x4A679253410272dd5232B3Ff7cF5dbB88f295319' as Address]: 'WETH',
  ['0x7a2088a1bFc9d81c55368AE168C2C02570cB814F' as Address]: 'USDC',
  // Sepolia 测试代币
  ['0xb7f9c55C8789107B52f400bCDB151a562f355977' as Address]: 'WETH',
  ['0xCBb50DC59f9A67E99DD216651acCaedba56Ee625' as Address]: 'USDC',
}

// Fee 到 tickSpacing 映射
export const FEE_TO_TICK_SPACING: Record<number, number> = {
  3000: 60,
  500: 10,
  10000: 200,
}