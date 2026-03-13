import { maxUint256 } from 'viem'

// 最大 uint256 值
export const UINT256_MAX = maxUint256

// Fee 到 tickSpacing 映射
export const FEE_TO_TICK_SPACING: Record<number, number> = {
  3000: 60,
  500: 10,
  10000: 200,
}

// 池代码哈希 (仅在需要CREATE2计算时使用)
// 注意：当前实现使用工厂合约的getPool函数获取池子地址，而不是CREATE2计算
export const POOL_CODE_HASH = '0xd4ef222214a3339bc363940bb631a1dd95488a0f26c5ff1c8f2bcc4a19ed9567'

// 最小/最大 tick
export const MIN_TICK = -887272
export const MAX_TICK = 887272