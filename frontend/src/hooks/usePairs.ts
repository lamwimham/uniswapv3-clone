'use client'

import { useEffect, useState, useMemo } from 'react'
import { usePublicClient } from 'wagmi'
import { Address } from 'viem'
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

        // 获取当前链 ID
        const chainId = await publicClient.getChainId()
        const config = CONTRACTS[chainId]

        if (!config) {
          console.warn('Contract config not found for chain', chainId)
          setPairs([])
          setIsLoading(false)
          return
        }

        // 直接使用配置中的池子列表，避免事件查询限制
        if (config.pools && config.pools.length > 0) {
          const parsedPairs: Pair[] = config.pools.map((poolInfo) => ({
            token0: {
              address: poolInfo.token0,
              symbol: TOKEN_SYMBOLS[poolInfo.token0] || 'Unknown',
            },
            token1: {
              address: poolInfo.token1,
              symbol: TOKEN_SYMBOLS[poolInfo.token1] || 'Unknown',
            },
            fee: poolInfo.fee,
            address: poolInfo.pool,
          }))

          console.log('Loaded pools from config:', parsedPairs)
          setPairs(parsedPairs)
          setPathFinder(new PathFinder(parsedPairs))
        } else {
          console.log('No pools configured for chain', chainId)
          setPairs([])
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