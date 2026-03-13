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