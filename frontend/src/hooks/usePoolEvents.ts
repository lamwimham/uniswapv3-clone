'use client'

import { useEffect, useState } from 'react'
import { usePublicClient, useWatchContractEvent } from 'wagmi'
import { Address, formatEther, parseAbiItem } from 'viem'
import { poolAbi } from '@/contracts/abis/pool'

export interface PoolEvent {
  type: 'Mint' | 'Burn' | 'Swap' | 'Collect'
  txHash: string
  blockNumber: bigint
  logIndex: number
  timestamp?: number
  data: Record<string, unknown>
  poolAddress: Address
}

interface UsePoolEventsOptions {
  poolAddress: Address | undefined
  enabled?: boolean
}

interface UsePoolEventsReturn {
  events: PoolEvent[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function usePoolEvents(options: UsePoolEventsOptions): UsePoolEventsReturn {
  const { poolAddress, enabled = true } = options
  const [events, setEvents] = useState<PoolEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const publicClient = usePublicClient()

  // 获取历史事件
  const fetchHistoricalEvents = async () => {
    if (!publicClient || !poolAddress || !enabled) return

    setIsLoading(true)
    setError(null)

    try {
      // 获取最近的区块
      const latestBlock = await publicClient.getBlockNumber()
      // Alchemy 免费版限制最多查询 10 个区块，这里查询最近 5 个区块
      // 实际事件主要依赖实时监听，历史事件只作为补充
      const fromBlock = latestBlock > 5n ? latestBlock - 5n : 0n

      console.log('[usePoolEvents] Fetching events from block', fromBlock, 'to', latestBlock, 'for pool', poolAddress)

      // 获取各种事件
      const [mintLogs, burnLogs, swapLogs, collectLogs] = await Promise.all([
        publicClient.getLogs({
          address: poolAddress,
          event: parseAbiItem('event Mint(address sender, address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1)'),
          fromBlock,
          toBlock: 'latest',
        }).catch(e => { console.error('[usePoolEvents] Mint logs error:', e); return [] }),
        publicClient.getLogs({
          address: poolAddress,
          event: parseAbiItem('event Burn(address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1)'),
          fromBlock,
          toBlock: 'latest',
        }).catch(e => { console.error('[usePoolEvents] Burn logs error:', e); return [] }),
        publicClient.getLogs({
          address: poolAddress,
          event: parseAbiItem('event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint256 sqrtPriceX96, uint128 liquidity, int24 tick)'),
          fromBlock,
          toBlock: 'latest',
        }).catch(e => { console.error('[usePoolEvents] Swap logs error:', e); return [] }),
        publicClient.getLogs({
          address: poolAddress,
          event: parseAbiItem('event Collect(address indexed owner, address recipient, int24 indexed tickLower, int24 indexed tickUpper, uint256 amount0, uint256 amount1)'),
          fromBlock,
          toBlock: 'latest',
        }).catch(e => { console.error('[usePoolEvents] Collect logs error:', e); return [] }),
      ])

      console.log('[usePoolEvents] Fetched logs:', { mintLogs: mintLogs.length, burnLogs: burnLogs.length, swapLogs: swapLogs.length, collectLogs: collectLogs.length })

      const allEvents: PoolEvent[] = []

      // 处理 Mint 事件
      mintLogs.forEach((log) => {
        allEvents.push({
          type: 'Mint',
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
          data: {
            sender: log.args.sender,
            owner: log.args.owner,
            tickLower: log.args.tickLower,
            tickUpper: log.args.tickUpper,
            amount: log.args.amount,
            amount0: log.args.amount0,
            amount1: log.args.amount1,
          },
          poolAddress,
        })
      })

      // 处理 Burn 事件
      burnLogs.forEach((log) => {
        allEvents.push({
          type: 'Burn',
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
          data: {
            owner: log.args.owner,
            tickLower: log.args.tickLower,
            tickUpper: log.args.tickUpper,
            amount: log.args.amount,
            amount0: log.args.amount0,
            amount1: log.args.amount1,
          },
          poolAddress,
        })
      })

      // 处理 Swap 事件
      swapLogs.forEach((log) => {
        allEvents.push({
          type: 'Swap',
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
          data: {
            sender: log.args.sender,
            recipient: log.args.recipient,
            amount0: log.args.amount0,
            amount1: log.args.amount1,
            sqrtPriceX96: log.args.sqrtPriceX96,
            liquidity: log.args.liquidity,
            tick: log.args.tick,
          },
          poolAddress,
        })
      })

      // 处理 Collect 事件
      collectLogs.forEach((log) => {
        allEvents.push({
          type: 'Collect',
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
          data: {
            owner: log.args.owner,
            recipient: log.args.recipient,
            tickLower: log.args.tickLower,
            tickUpper: log.args.tickUpper,
            amount0: log.args.amount0,
            amount1: log.args.amount1,
          },
          poolAddress,
        })
      })

      // 按区块号和日志索引排序（最新的在前）
      allEvents.sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) {
          return Number(b.blockNumber - a.blockNumber)
        }
        return b.logIndex - a.logIndex
      })

      setEvents(allEvents)
    } catch (err) {
      console.error('Failed to fetch events:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch events'))
    } finally {
      setIsLoading(false)
    }
  }

  // 初始加载
  useEffect(() => {
    fetchHistoricalEvents()
  }, [poolAddress, enabled, publicClient])

  // 实时监听 Mint 事件
  useWatchContractEvent({
    address: poolAddress,
    abi: poolAbi,
    eventName: 'Mint',
    onLogs(logs) {
      console.log('[usePoolEvents] Received Mint logs:', logs.length)
      logs.forEach((log) => {
        const newEvent: PoolEvent = {
          type: 'Mint',
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
          data: {
            sender: log.args.sender,
            owner: log.args.owner,
            tickLower: log.args.tickLower,
            tickUpper: log.args.tickUpper,
            amount: log.args.amount,
            amount0: log.args.amount0,
            amount1: log.args.amount1,
          },
          poolAddress: poolAddress!,
        }
        setEvents((prev) => [newEvent, ...prev])
      })
    },
  })

  // 实时监听 Swap 事件
  useWatchContractEvent({
    address: poolAddress,
    abi: poolAbi,
    eventName: 'Swap',
    onLogs(logs) {
      console.log('[usePoolEvents] Received Swap logs:', logs.length)
      logs.forEach((log) => {
        const newEvent: PoolEvent = {
          type: 'Swap',
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
          data: {
            sender: log.args.sender,
            recipient: log.args.recipient,
            amount0: log.args.amount0,
            amount1: log.args.amount1,
            sqrtPriceX96: log.args.sqrtPriceX96,
            liquidity: log.args.liquidity,
            tick: log.args.tick,
          },
          poolAddress: poolAddress!,
        }
        setEvents((prev) => [newEvent, ...prev])
      })
    },
  })

  // 实时监听 Burn 事件
  useWatchContractEvent({
    address: poolAddress,
    abi: poolAbi,
    eventName: 'Burn',
    onLogs(logs) {
      console.log('[usePoolEvents] Received Burn logs:', logs.length)
      logs.forEach((log) => {
        const newEvent: PoolEvent = {
          type: 'Burn',
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
          data: {
            owner: log.args.owner,
            tickLower: log.args.tickLower,
            tickUpper: log.args.tickUpper,
            amount: log.args.amount,
            amount0: log.args.amount0,
            amount1: log.args.amount1,
          },
          poolAddress: poolAddress!,
        }
        setEvents((prev) => [newEvent, ...prev])
      })
    },
  })

  // 实时监听 Collect 事件
  useWatchContractEvent({
    address: poolAddress,
    abi: poolAbi,
    eventName: 'Collect',
    onLogs(logs) {
      console.log('[usePoolEvents] Received Collect logs:', logs.length)
      logs.forEach((log) => {
        const newEvent: PoolEvent = {
          type: 'Collect',
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
          data: {
            owner: log.args.owner,
            recipient: log.args.recipient,
            tickLower: log.args.tickLower,
            tickUpper: log.args.tickUpper,
            amount0: log.args.amount0,
            amount1: log.args.amount1,
          },
          poolAddress: poolAddress!,
        }
        setEvents((prev) => [newEvent, ...prev])
      })
    },
  })

  return {
    events,
    isLoading,
    error,
    refetch: fetchHistoricalEvents,
  }
}

// 多池事件监听
export function useMultiplePoolEvents(
  poolAddresses: Address[],
  enabled = true
): { events: PoolEvent[]; isLoading: boolean } {
  const [allEvents, setAllEvents] = useState<PoolEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const publicClient = usePublicClient()

  useEffect(() => {
    if (!publicClient || poolAddresses.length === 0 || !enabled) return

    setIsLoading(true)

    const fetchAllEvents = async () => {
      try {
        const latestBlock = await publicClient.getBlockNumber()
        const fromBlock = 0n

        const eventsPromises = poolAddresses.map(async (poolAddress) => {
          const [swapLogs] = await Promise.all([
            publicClient.getLogs({
              address: poolAddress,
              event: parseAbiItem('event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint256 sqrtPriceX96, uint128 liquidity, int24 tick)'),
              fromBlock,
              toBlock: 'latest',
            }),
          ])

          return swapLogs.map((log) => ({
            type: 'Swap' as const,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            logIndex: log.logIndex,
            data: log.args,
            poolAddress,
          }))
        })

        const results = await Promise.all(eventsPromises)
        const flattened = results.flat().sort((a, b) => {
          if (a.blockNumber !== b.blockNumber) {
            return Number(b.blockNumber - a.blockNumber)
          }
          return b.logIndex - a.logIndex
        })

        setAllEvents(flattened)
      } catch (err) {
        console.error('Failed to fetch multiple pool events:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllEvents()
  }, [publicClient, poolAddresses, enabled])

  return { events: allEvents, isLoading }
}