'use client'

import { useEffect, useState, useMemo } from 'react'
import { usePublicClient } from 'wagmi'
import { Address, parseEventLogs } from 'viem'
import { factoryAbi } from '@/contracts/abis/factory'
import { TOKEN_SYMBOLS, CONTRACTS } from '@/contracts/addresses'
import { PathFinder, Pair, PathElement } from '@/lib/pathFinder'

export function usePairs() {
  const [pairs, setPairs] = useState<Pair[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [pathFinder, setPathFinder] = useState<PathFinder | null>(null)

  const publicClient = usePublicClient()

  useEffect(() => {
    const loadPairs = async () => {
      if (!publicClient) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        // 获取 Factory 地址
        const chainId = await publicClient.getChainId()
        const factoryAddress = CONTRACTS[chainId]?.Factory

        if (!factoryAddress) {
          console.warn('Factory address not configured for chain', chainId)
          setPairs([])
          setIsLoading(false)
          return
        }

        // 获取 PoolCreated 事件日志
        console.log('Fetching logs from factory:', factoryAddress)
        const logs = await publicClient.getLogs({
          address: factoryAddress,
          event: {
            type: 'event',
            name: 'PoolCreated',
            inputs: [
              { indexed: true, name: 'token0', type: 'address' },
              { indexed: true, name: 'token1', type: 'address' },
              { indexed: true, name: 'fee', type: 'uint24' },
              { indexed: false, name: 'pool', type: 'address' },
            ],
          },
          fromBlock: 0n,
          toBlock: 'latest',
        })
        console.log('Raw logs:', logs)

        // 解析事件日志
        const parsedPairs: Pair[] = logs.map((log) => {
          const token0 = log.args.token0 as Address
          const token1 = log.args.token1 as Address
          const fee = Number(log.args.fee)
          const pool = log.args.pool as Address

          return {
            token0: {
              address: token0,
              symbol: TOKEN_SYMBOLS[token0] || 'Unknown',
            },
            token1: {
              address: token1,
              symbol: TOKEN_SYMBOLS[token1] || 'Unknown',
            },
            fee,
            address: pool,
          }
        })

        setPairs(parsedPairs)

        // 创建 PathFinder 实例
        if (parsedPairs.length > 0) {
          setPathFinder(new PathFinder(parsedPairs))
        }
      } catch (err) {
        console.error('Failed to load pairs:', err)
        setError(err instanceof Error ? err : new Error('Failed to load pairs'))
      } finally {
        setIsLoading(false)
      }
    }

    loadPairs()
  }, [publicClient])

  return { pairs, isLoading, error, pathFinder }
}

// 从 pairs 中提取所有代币
export function useTokens(pairs: Pair[]) {
  return useMemo(() => {
    const tokenMap = new Map<Address, { address: Address; symbol: string }>()

    pairs.forEach((pair) => {
      tokenMap.set(pair.token0.address, pair.token0)
      tokenMap.set(pair.token1.address, pair.token1)
    })

    return Array.from(tokenMap.values())
  }, [pairs])
}

// 查找路径
export function usePath(
  pathFinder: PathFinder | null,
  tokenIn: Address | undefined,
  tokenOut: Address | undefined
) {
  const [path, setPath] = useState<PathElement[]>([])
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!pathFinder || !tokenIn || !tokenOut) {
      setPath([])
      return
    }

    try {
      const foundPath = pathFinder.findPath(tokenIn, tokenOut)
      setPath(foundPath)
      setError(null)
    } catch (err) {
      console.error('Failed to find path:', err)
      setError(err instanceof Error ? err : new Error('Path not found'))
      setPath([])
    }
  }, [pathFinder, tokenIn, tokenOut])

  return { path, error }
}