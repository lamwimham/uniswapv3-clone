'use client'

import { useState, useEffect } from 'react'
import { usePublicClient } from 'wagmi'
import { Address, parseAbiItem } from 'viem'
import { factoryAbi } from '@/contracts/abis/factory'
import { CONTRACTS } from '@/contracts/addresses'
import { useChainId, useWatchContractEvent } from 'wagmi'

export interface PairInfo {
  token0: Address
  token1: Address
  fee: number
  pool: Address
  blockNumber: bigint
  txHash: string
}

interface UsePairsEventsReturn {
  pairs: PairInfo[]
  isLoading: boolean
  error: Error | null
}

export function usePairsEvents(): UsePairsEventsReturn {
  const [pairs, setPairs] = useState<PairInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const chainId = useChainId()
  const factoryAddress = CONTRACTS[chainId]?.Factory
  const publicClient = usePublicClient()

  // 获取历史事件
  useEffect(() => {
    const fetchPairs = async () => {
      if (!publicClient || !factoryAddress) return

      setIsLoading(true)
      setError(null)

      try {
        const logs = await publicClient.getLogs({
          address: factoryAddress,
          event: parseAbiItem('event PoolCreated(address indexed token0, address indexed token1, address indexed fee, address pool)'),
          fromBlock: 'earliest',
          toBlock: 'latest',
        })

        const pairInfos: PairInfo[] = logs.map((log) => ({
          token0: log.args.token0 as Address,
          token1: log.args.token1 as Address,
          fee: Number(log.args.fee),
          pool: log.args.pool as Address,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
        }))

        setPairs(pairInfos)
      } catch (err) {
        console.error('Failed to fetch pairs:', err)
        setError(err instanceof Error ? err : new Error('Failed to fetch pairs'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchPairs()
  }, [publicClient, factoryAddress])

  // 实时监听新池子创建
  useWatchContractEvent({
    address: factoryAddress,
    abi: factoryAbi,
    eventName: 'PoolCreated',
    onLogs(logs) {
      logs.forEach((log) => {
        const newPair: PairInfo = {
          token0: log.args.token0 as Address,
          token1: log.args.token1 as Address,
          fee: Number(log.args.fee),
          pool: log.args.pool as Address,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
        }
        setPairs((prev) => [...prev, newPair])
      })
    },
  })

  return { pairs, isLoading, error }
}