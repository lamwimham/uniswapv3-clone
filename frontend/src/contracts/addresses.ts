import { Address } from 'viem'

// 合约地址配置
// 部署后更新这些地址
export const CONTRACTS: Record<number, {
  WETH: Address
  USDC: Address
  Factory: Address
  Manager: Address
  Quoter: Address
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
    WETH: '0x0000000000000000000000000000000000000000' as Address,
    USDC: '0x0000000000000000000000000000000000000000' as Address,
    Factory: '0x0000000000000000000000000000000000000000' as Address,
    Manager: '0x0000000000000000000000000000000000000000' as Address,
    Quoter: '0x0000000000000000000000000000000000000000' as Address,
  },
}

// 代币符号映射
export const TOKEN_SYMBOLS: Record<Address, string> = {
  // 本地测试代币
  ['0x4A679253410272dd5232B3Ff7cF5dbB88f295319' as Address]: 'WETH',
  ['0x7a2088a1bFc9d81c55368AE168C2C02570cB814F' as Address]: 'USDC',
}

// Fee 到 tickSpacing 映射
export const FEE_TO_TICK_SPACING: Record<number, number> = {
  3000: 60,
  500: 10,
  10000: 200,
}