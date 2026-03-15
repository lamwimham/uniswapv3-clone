'use client'

import { useState, useMemo, useEffect } from 'react'
import { useAccount, useChainId, usePublicClient } from 'wagmi'
import { Address, parseEther, encodeAbiParameters } from 'viem'
import { PriceRange } from './PriceRange'
import { TokenInput } from '../swap/TokenInput'
import { useAddLiquidity, useTokenApproval, useTokenBalance } from '@/hooks'
import { CONTRACTS } from '@/contracts/addresses'
import { priceToTick, getNearestUsableTick } from '@/lib/tickMath'
import { FEE_TO_TICK_SPACING } from '@/lib/constants'
import { getPoolAddress } from '@/lib/getPoolAddress'

interface AddLiquidityFormProps {
  token0: { address: Address; symbol: string }
  token1: { address: Address; symbol: string }
  fee: number
  onClose?: () => void
}

const SLIPPAGE = 0.5

export function AddLiquidityForm({ token0, token1, fee, onClose }: AddLiquidityFormProps) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const managerAddress = CONTRACTS[chainId]?.Manager
  const factoryAddress = CONTRACTS[chainId]?.Factory

  const [amount0, setAmount0] = useState('')
  const [amount1, setAmount1] = useState('')
  const [lowerPrice, setLowerPrice] = useState('')
  const [upperPrice, setUpperPrice] = useState('')

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

  const { balance: balance0 } = useTokenBalance(token0.address)
  const { balance: balance1 } = useTokenBalance(token1.address)

  // TODO: 硬编码授权检查 - 后续需改为动态值
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

  const { needsApproval: needsApproval0 } = useTokenApproval({
    tokenAddress: token0.address,
    spender: managerAddress, // 授权给 Manager 合约
    amount: amount0 ? parseEther(amount0) : 0n,
  })

  // TODO: 硬编码授权检查 - 后续需改为动态值
  const { needsApproval: needsApproval1 } = useTokenApproval({
    tokenAddress: token1.address,
    spender: managerAddress, // 授权给 Manager 合约
    amount: amount1 ? parseEther(amount1) : 0n,
  })

  const { mint, approve, isPending, isConfirming, isSuccess, error } = useAddLiquidity()

  const handleAddLiquidity = async () => {
    try {
      // TODO: 硬编码参数以跑通流程 - 后续需改为动态值
      const amount0BigInt = parseEther(amount0)
      const amount1BigInt = parseEther(amount1)
      const { lowerTick, upperTick } = ticks!
      
      // 计算流动性值 (这里使用硬编码的值，实际应根据金额计算)
      const liquidity = amount0BigInt < amount1BigInt ? amount0BigInt : amount1BigInt
      
      // 构建回调数据 (token0, token1, player 地址)
      // player 是用户地址，用于从用户账户转移 token 到池子
      const data = encodeAbiParameters(
        [
          { name: 'token0', type: 'address' },
          { name: 'token1', type: 'address' },
          { name: 'player', type: 'address' }
        ],
        [token0.address, token1.address, address!]
      ) as `0x${string}`

      if (!factoryAddress) {
        throw new Error('Factory address not configured for current chain')
      }

      console.log("Minting liquidity...");
      console.log("Pool address:", poolAddress);
      if (!poolAddress) {
        throw new Error('Pool address not available')
      }

      await mint({
        poolAddress,
        lowerTick,
        upperTick,
        liquidity,
        data,
      })
    } catch (error) {
      // 检查是否是用户拒绝错误
      if (error && typeof error === 'object' && 'message' in error && 
          (error.message as string).includes('User rejected')) {
        console.log('用户拒绝了交易，请在钱包中确认交易')
        // 可以在这里添加用户友好的提示
      } else {
        console.error('添加流动性失败:', error)
        throw error
      }
    }
  }

  // 添加流动性成功后的回调
  useEffect(() => {
    if (isSuccess && amount0 && amount1) {
      const newPosition = {
        tokenA: token0.address,
        tokenB: token1.address,
        fee,
        lowerTick: ticks?.lowerTick || 0,
        upperTick: ticks?.upperTick || 0,
        amount0: parseEther(amount0).toString(),
        amount1: parseEther(amount1).toString(),
      }

      if (address) {
        // 从localStorage获取现有头寸
        const existingPositions = JSON.parse(localStorage.getItem(`positions_${address}`) || '[]')
        // 添加新头寸
        const updatedPositions = [...existingPositions, newPosition]
        // 保存回localStorage
        localStorage.setItem(`positions_${address}`, JSON.stringify(updatedPositions))
      }
    }
  }, [isSuccess, address, token0.address, token1.address, fee, ticks, amount0, amount1])

  const handleApprove = async (tokenAddress: Address, amount: string) => {
    if (!managerAddress) {
      throw new Error('Manager address not available');
    }
    // TODO: 硬编码授权值 - 后续需改为动态值
    if (tokenAddress === token0.address) {
      await approve(tokenAddress, parseEther(amount0), managerAddress)
    } else if (tokenAddress === token1.address) {
      await approve(tokenAddress, parseEther(amount1), managerAddress)
    }
  }

  const isLoading = isPending || isConfirming
  const canAdd = isConnected && managerAddress && poolAddress && !needsApproval0 && !needsApproval1 && ticks && amount0 && amount1

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Add Liquidity</h2>
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
        />

        {ticks && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            Tick Range: [{ticks.lowerTick}, {ticks.upperTick}]
          </div>
        )}

        {/* Token Amounts */}
        <div className="space-y-3">
          <TokenInput
            value={amount0}
            onChange={setAmount0}
            tokenSymbol={token0.symbol}
            balance={balance0}
            disabled={!isConnected || isLoading}
            label={`${token0.symbol} Amount`}
          />
          <TokenInput
            value={amount1}
            onChange={setAmount1}
            tokenSymbol={token1.symbol}
            balance={balance1}
            disabled={!isConnected || isLoading}
            label={`${token1.symbol} Amount`}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-3">
            {error.message}
          </div>
        )}

        {/* Action Buttons */}
        {isConnected && needsApproval0 ? (
          <button
            onClick={() => handleApprove(token0.address, amount0)}
            disabled={isLoading || !amount0}
            className="w-full py-4 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-2xl font-semibold disabled:opacity-70"
          >
            {isLoading ? 'Approving...' : `Approve ${token0.symbol}`}
          </button>
        ) : isConnected && needsApproval1 ? (
          <button
            onClick={() => handleApprove(token1.address, amount1)}
            disabled={isLoading || !amount1}
            className="w-full py-4 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-2xl font-semibold disabled:opacity-70"
          >
            {isLoading ? 'Approving...' : `Approve ${token1.symbol}`}
          </button>
        ) : (
          <button
            onClick={handleAddLiquidity}
            disabled={!canAdd || isLoading || !isConnected}
            className={`w-full py-4 rounded-2xl font-semibold transition-all ${
              isSuccess
                ? 'bg-green-500 text-white'
                : canAdd
                ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {isLoading ? 'Adding...' : isSuccess ? '✓ Success!' : !isConnected ? 'Connect Wallet to Add Liquidity' : 'Add Liquidity'}
          </button>
        )}
      </div>
    </div>
  )
}