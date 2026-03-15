import { TickMath, encodeSqrtRatioX96, nearestUsableTick } from '@uniswap/v3-sdk'
import JSBI from 'jsbi'
import { FEE_TO_TICK_SPACING } from './constants'

// 价格转 sqrtPriceX96
export function priceToSqrtPriceX96(price: number): bigint {
  const sqrtRatio = encodeSqrtRatioX96(price, 1)
  return BigInt(sqrtRatio.toString())
}

// 价格转 tick
export function priceToTick(price: number): number {
  const sqrtPriceX96 = priceToSqrtPriceX96(price)
  return TickMath.getTickAtSqrtRatio(JSBI.BigInt(sqrtPriceX96.toString()))
}

// 获取最近可用 tick
export function getNearestUsableTick(tick: number, fee: number): number {
  const tickSpacing = FEE_TO_TICK_SPACING[fee] || 60
  return nearestUsableTick(tick, tickSpacing)
}

// sqrtPriceX96 转价格
export function sqrtPriceX96ToPrice(sqrtPriceX96: bigint): number {
  const Q96 = BigInt(2) ** BigInt(96)
  const price = (sqrtPriceX96 * sqrtPriceX96) / (Q96 * Q96)
  return Number(price) / 1e18
}

// tick 转 sqrtPriceX96
export function tickToSqrtPriceX96(tick: number): bigint {
  const sqrtRatio = TickMath.getSqrtRatioAtTick(tick)
  return BigInt(sqrtRatio.toString())
}

// 计算流动性
// 根据当前价格相对于价格范围的位置，计算需要的流动性
export function calculateLiquidity(
  amount0: bigint,
  amount1: bigint,
  sqrtPriceX96: bigint,
  lowerTick: number,
  upperTick: number
): bigint {
  const Q96 = BigInt(2) ** BigInt(96)
  
  // 计算 sqrtPrice
  const sqrtPriceCurrent = sqrtPriceX96
  const sqrtPriceLower = tickToSqrtPriceX96(lowerTick)
  const sqrtPriceUpper = tickToSqrtPriceX96(upperTick)
  
  // 获取当前 tick
  const currentTick = TickMath.getTickAtSqrtRatio(JSBI.BigInt(sqrtPriceX96.toString()))
  
  // 情况1: 当前价格低于价格范围 - 只需要 token1
  if (currentTick < lowerTick) {
    // L = amount1 / (sqrtPriceUpper - sqrtPriceLower)
    if (amount1 === 0n) return 0n
    const liquidity = (amount1 * Q96) / (sqrtPriceUpper - sqrtPriceLower)
    return liquidity
  }
  
  // 情况2: 当前价格高于价格范围 - 只需要 token0
  if (currentTick > upperTick) {
    // L = amount0 / (1/sqrtPriceLower - 1/sqrtPriceUpper)
    if (amount0 === 0n) return 0n
    // L = amount0 * sqrtPriceLower * sqrtPriceUpper / (sqrtPriceUpper - sqrtPriceLower)
    const liquidity = (amount0 * sqrtPriceLower * sqrtPriceUpper) / 
                      (Q96 * (sqrtPriceUpper - sqrtPriceLower))
    return liquidity
  }
  
  // 情况3: 当前价格在范围内 - 需要 token0 和 token1
  // L0 = amount0 * sqrtPriceCurrent * sqrtPriceUpper / (sqrtPriceUpper - sqrtPriceCurrent)
  // L1 = amount1 * Q96 / (sqrtPriceCurrent - sqrtPriceLower)
  // L = min(L0, L1)
  
  let liquidity0 = BigInt(0)
  let liquidity1 = BigInt(0)
  
  if (amount0 > 0n && sqrtPriceUpper > sqrtPriceCurrent) {
    liquidity0 = (amount0 * sqrtPriceCurrent * sqrtPriceUpper) / 
                 (Q96 * (sqrtPriceUpper - sqrtPriceCurrent))
  }
  
  if (amount1 > 0n && sqrtPriceCurrent > sqrtPriceLower) {
    liquidity1 = (amount1 * Q96) / (sqrtPriceCurrent - sqrtPriceLower)
  }
  
  // 返回较小的流动性值
  if (liquidity0 === 0n) return liquidity1
  if (liquidity1 === 0n) return liquidity0
  return liquidity0 < liquidity1 ? liquidity0 : liquidity1
}

// 根据流动性计算需要的代币数量
export function calculateAmountsFromLiquidity(
  liquidity: bigint,
  sqrtPriceX96: bigint,
  lowerTick: number,
  upperTick: number
): { amount0: bigint; amount1: bigint } {
  const Q96 = BigInt(2) ** BigInt(96)
  
  const sqrtPriceCurrent = sqrtPriceX96
  const sqrtPriceLower = tickToSqrtPriceX96(lowerTick)
  const sqrtPriceUpper = tickToSqrtPriceX96(upperTick)
  
  const currentTick = TickMath.getTickAtSqrtRatio(JSBI.BigInt(sqrtPriceX96.toString()))
  
  let amount0 = BigInt(0)
  let amount1 = BigInt(0)
  
  // 当前价格低于范围
  if (currentTick < lowerTick) {
    amount1 = (liquidity * (sqrtPriceUpper - sqrtPriceLower)) / Q96
  }
  // 当前价格高于范围
  else if (currentTick > upperTick) {
    amount0 = (liquidity * Q96 * (sqrtPriceUpper - sqrtPriceLower)) / (sqrtPriceLower * sqrtPriceUpper)
  }
  // 当前价格在范围内
  else {
    amount0 = (liquidity * Q96 * (sqrtPriceUpper - sqrtPriceCurrent)) / (sqrtPriceCurrent * sqrtPriceUpper)
    amount1 = (liquidity * (sqrtPriceCurrent - sqrtPriceLower)) / Q96
  }
  
  return { amount0, amount1 }
}