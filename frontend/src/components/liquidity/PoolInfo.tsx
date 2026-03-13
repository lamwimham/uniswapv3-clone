'use client'

import { useEffect, useState } from 'react'
import { Address } from 'viem'
import { usePoolInfo, useTokenInfo } from '@/hooks'
import { formatSqrtPriceX96 } from '@/lib/utils'

interface PoolInfoProps {
  poolAddress: Address | undefined
}

export function PoolInfo({ poolAddress }: PoolInfoProps) {
  const { 
    sqrtPriceX96, 
    tick, 
    liquidity, 
    token0: token0Address, 
    token1: token1Address, 
    isLoading 
  } = usePoolInfo(poolAddress)

  const { symbol: token0Symbol, decimals: token0Decimals } = useTokenInfo(token0Address)
  const { symbol: token1Symbol, decimals: token1Decimals } = useTokenInfo(token1Address)

  // 计算价格
  const [price, setPrice] = useState<number | null>(null)
  const [inversePrice, setInversePrice] = useState<number | null>(null)

  useEffect(() => {
    if (sqrtPriceX96 && token0Decimals !== undefined && token1Decimals !== undefined) {
      try {
        // 计算 token0/token1 的价格
        const priceValue = formatSqrtPriceX96(sqrtPriceX96, token0Decimals, token1Decimals)
        setPrice(priceValue)
        
        // 计算反向价格 token1/token0
        setInversePrice(priceValue > 0 ? 1 / priceValue : null)
      } catch (error) {
        console.error('Error calculating price:', error)
        setPrice(null)
        setInversePrice(null)
      }
    } else {
      setPrice(null)
      setInversePrice(null)
    }
  }, [sqrtPriceX96, token0Decimals, token1Decimals])

  if (!poolAddress) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pool Information</h3>
        <p className="text-gray-500">No pool selected</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Pool Information</h3>
      
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 交易对信息 */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <span className="text-gray-500">Pair</span>
            <span className="font-medium">
              {token0Symbol}/{token1Symbol}
            </span>
          </div>

          {/* 当前价格 */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <span className="text-gray-500">Price</span>
            <div className="text-right">
              <div className="font-medium">
                {price !== null ? `${price.toFixed(6)} ${token1Symbol} per ${token0Symbol}` : 'N/A'}
              </div>
              <div className="text-xs text-gray-500">
                {inversePrice !== null ? `${inversePrice.toFixed(6)} ${token0Symbol} per ${token1Symbol}` : ''}
              </div>
            </div>
          </div>

          {/* 当前价格 (Tick) */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <span className="text-gray-500">Current Tick</span>
            <span className="font-medium">
              {tick !== undefined ? tick.toString() : 'N/A'}
            </span>
          </div>

          {/* 流动性 */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <span className="text-gray-500">Liquidity</span>
            <span className="font-medium">
              {liquidity ? liquidity.toString() : 'N/A'}
            </span>
          </div>

          {/* 池子地址 */}
          <div className="flex items-start justify-between">
            <span className="text-gray-500">Pool Address</span>
            <span className="font-mono text-xs text-gray-500 break-all max-w-[50%]">
              {poolAddress.substring(0, 6)}...{poolAddress.substring(poolAddress.length - 4)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}