'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAccount, useChainId, usePublicClient } from 'wagmi'
import { Address, formatEther, parseEther } from 'viem'
import { PriceRange } from './PriceRange'
import { useRemoveLiquidity, usePoolPosition, usePoolInfo } from '@/hooks'
import { getPoolAddress } from '@/lib/getPoolAddress'
import { CONTRACTS } from '@/contracts/addresses'
import { priceToTick, getNearestUsableTick, sqrtPriceX96ToPrice } from '@/lib/tickMath'
import { FEE_TO_TICK_SPACING } from '@/lib/constants'

interface RemoveLiquidityFormProps {
  token0: { address: Address; symbol: string }
  token1: { address: Address; symbol: string }
  fee: number
  onClose?: () => void
}

export function RemoveLiquidityForm({ token0, token1, fee, onClose }: RemoveLiquidityFormProps) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const factoryAddress = CONTRACTS[chainId]?.Factory

  const [poolAddress, setPoolAddress] = useState<Address | undefined>(undefined)

  // 获取池子地址
  useEffect(() => {
    const fetchPoolAddress = async () => {
      if (factoryAddress && token0?.address && token1?.address && fee) {
        try {
          const address = await getPoolAddress(publicClient, factoryAddress, token0.address, token1.address, fee)
          setPoolAddress(address !== '0x0000000000000000000000000000000000000000' ? address : undefined)
        } catch (error) {
          console.error('Failed to fetch pool address:', error)
          setPoolAddress(undefined)
        }
      }
    }

    fetchPoolAddress()
  }, [publicClient, factoryAddress, token0?.address, token1?.address, fee])

  const [lowerPrice, setLowerPrice] = useState('')
  const [upperPrice, setUpperPrice] = useState('')
  const [amountToRemove, setAmountToRemove] = useState('')

  const ticks = useMemo(() => {
    if (!lowerPrice || !upperPrice) return null
    try {
      const lowerTick = priceToTick(parseFloat(lowerPrice))
      const upperTick = priceToTick(parseFloat(upperPrice))
      const tickSpacing = FEE_TO_TICK_SPACING[fee] || 60
      return {
        lowerTick: getNearestUsableTick(lowerTick, tickSpacing),
        upperTick: getNearestUsableTick(upperTick, tickSpacing),
      }
    } catch {
      return null
    }
  }, [lowerPrice, upperPrice, fee])

  const { sqrtPriceX96 } = usePoolInfo(poolAddress)
  const { liquidity: positionLiquidity, isLoading: positionLoading } = usePoolPosition(
    poolAddress,
    address,
    ticks?.lowerTick ?? 0,
    ticks?.upperTick ?? 0
  )

  const { removeLiquidity, isPending, isConfirming, isSuccess, error } = useRemoveLiquidity()
  const currentPrice = sqrtPriceX96 ? sqrtPriceX96ToPrice(sqrtPriceX96).toFixed(6) : undefined

  const handleRemoveLiquidity = async () => {
    if (!poolAddress || !ticks || !amountToRemove) return
    
    try {
      await removeLiquidity({
        poolAddress,
        lowerTick: ticks.lowerTick,
        upperTick: ticks.upperTick,
        amount: parseEther(amountToRemove),
      })
    } catch (error) {
      // 检查是否是用户拒绝错误
      if (error && typeof error === 'object' && 'message' in error && 
          (error.message as string).includes('User rejected')) {
        console.log('用户拒绝了交易，请在钱包中确认交易')
        // 可以在这里添加用户友好的提示
      } else {
        console.error('移除流动性失败:', error)
        throw error
      }
    }
  }

  const isLoading = isPending || isConfirming || positionLoading
  const canRemove = isConnected && ticks && positionLiquidity && positionLiquidity > 0n && amountToRemove

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Remove Liquidity</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {token0.symbol} / {token1.symbol} • {fee / 10000}% fee
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-6 space-y-5">
        {/* Price Range */}
        <PriceRange
          lowerPrice={lowerPrice}
          upperPrice={upperPrice}
          onLowerPriceChange={setLowerPrice}
          onUpperPriceChange={setUpperPrice}
          disabled={!isConnected || isLoading}
          currentPrice={currentPrice}
        />

        {/* Available Liquidity */}
        {ticks && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4">
            <div className="text-sm text-gray-500 mb-1">Available Liquidity</div>
            <div className="text-2xl font-bold text-gray-900">
              {positionLoading ? '...' : positionLiquidity ? formatEther(positionLiquidity) : '0'}
            </div>
          </div>
        )}

        {/* Amount to Remove */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-500 mb-2">
            Amount to Remove
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={amountToRemove}
            onChange={(e) => setAmountToRemove(e.target.value)}
            disabled={!isConnected || isLoading}
            className="w-full p-4 bg-gray-50 rounded-xl text-lg font-medium outline-none focus:bg-white focus:ring-2 focus:ring-red-100 disabled:opacity-50 transition-all"
          />
        </div>

        {ticks && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            Tick Range: [{ticks.lowerTick}, {ticks.upperTick}]
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-3">
            {error.message}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleRemoveLiquidity}
          disabled={!canRemove || isLoading || !isConnected}
          className={`w-full py-4 rounded-2xl font-semibold transition-all ${
            isSuccess
              ? 'bg-green-500 text-white'
              : canRemove
              ? 'bg-gradient-to-r from-red-400 to-rose-500 text-white'
              : 'bg-gray-100 text-gray-400'
          }`}
        >
          {isLoading ? 'Removing...' : isSuccess ? '✓ Success!' : !isConnected ? 'Connect Wallet to Remove Liquidity' : 'Remove Liquidity'}
        </button>
      </div>
    </div>
  )
}