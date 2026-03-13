'use client'

import { useState, useEffect } from 'react'
import { Address, formatEther } from 'viem'
import { useAccount, useReadContract } from 'wagmi'
import { managerAbi } from '@/contracts/abis/manager'
import { erc20Abi } from '@/contracts/abis/erc20'
import { CONTRACTS } from '@/contracts/addresses'
import { useChainId } from 'wagmi'
import { useTokenInfo } from '@/hooks'

interface Position {
  tokenA: Address
  tokenB: Address
  fee: number
  lowerTick: number
  upperTick: number
  amount0: bigint | string  // 可以是 BigInt 或字符串
  amount1: bigint | string  // 可以是 BigInt 或字符串
}

export function UserPositions() {
  const { address: userAddress, isConnected } = useAccount()
  const chainId = useChainId()
  const managerAddress = CONTRACTS[chainId]?.Manager

  // 使用localStorage存储用户添加的头寸
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(false)

  // 从localStorage加载用户头寸
  useEffect(() => {
    if (isConnected && userAddress) {
      const storedPositions = localStorage.getItem(`positions_${userAddress}`)
      if (storedPositions) {
        try {
          const parsedPositions = JSON.parse(storedPositions)
          // 将换字符串化的 BigInt 回 BigInt
          const convertedPositions = parsedPositions.map((pos: any) => ({
            ...pos,
            amount0: BigInt(pos.amount0),
            amount1: BigInt(pos.amount1),
          }))
          setPositions(convertedPositions)
        } catch (error) {
          console.error('Error parsing stored positions:', error)
        }
      }
    }
  }, [isConnected, userAddress])

  if (!isConnected) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Positions</h3>
        <p className="text-gray-500">Connect wallet to view your liquidity positions</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Your Positions</h3>
        <button
          onClick={() => {
            // 刷新按钮，重新从localStorage加载
            if (userAddress) {
              const storedPositions = localStorage.getItem(`positions_${userAddress}`)
              if (storedPositions) {
                try {
                  const parsedPositions = JSON.parse(storedPositions)
                  // 将字符串化的 BigInt 回 BigInt
                  const convertedPositions = parsedPositions.map((pos: any) => ({
                    ...pos,
                    amount0: BigInt(pos.amount0),
                    amount1: BigInt(pos.amount1),
                  }))
                  setPositions(convertedPositions)
                } catch (error) {
                  console.error('Error parsing stored positions:', error)
                }
              }
            }
          }}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {positions.length === 0 ? (
        <p className="text-gray-500">No liquidity positions found. Add liquidity to get started.</p>
      ) : (
        <div className="space-y-4">
          {positions.map((position, index) => (
            <PositionDisplay key={index} position={position} />
          ))}
        </div>
      )}
    </div>
  )
}

// 单独的组件用于显示单个头寸
function PositionDisplay({ position }: { position: Position }) {
  const token0Info = useTokenInfo(position.tokenA)
  const token1Info = useTokenInfo(position.tokenB)

  // 确保 amount0 和 amount1 是 BigInt 类型
  const amount0BigInt = typeof position.amount0 === 'string' ? BigInt(position.amount0) : position.amount0
  const amount1BigInt = typeof position.amount1 === 'string' ? BigInt(position.amount1) : position.amount1

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium">
            {token0Info.symbol || 'Token'}-{token1Info.symbol || 'Token'}
            <span className="text-gray-500 ml-2">({position.fee / 10000}%)</span>
          </h4>
          <p className="text-sm text-gray-500">
            Range: {position.lowerTick} to {position.upperTick}
          </p>
        </div>
        <div className="text-right">
          <p className="font-medium">
            {formatEther(amount0BigInt)} {token0Info.symbol || 'TKN'}
          </p>
          <p className="font-medium">
            {formatEther(amount1BigInt)} {token1Info.symbol || 'TKN'}
          </p>
        </div>
      </div>
    </div>
  )
}