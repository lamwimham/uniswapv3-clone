'use client'

import { useCallback, useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { poolAbi } from '@/contracts/abis/pool'
import { Address, maxUint128, keccak256, encodeAbiParameters, parseAbiParameters } from 'viem'
import { useChainId } from 'wagmi'

interface RemoveLiquidityParams {
  poolAddress: Address
  lowerTick: number
  upperTick: number
  amount: bigint
}

interface UseRemoveLiquidityReturn {
  removeLiquidity: (params: RemoveLiquidityParams) => Promise<void>
  isPending: boolean
  isConfirming: boolean
  isSuccess: boolean
  error: Error | null
  burnHash: `0x${string}` | undefined
  collectHash: `0x${string}` | undefined
}

export function useRemoveLiquidity(): UseRemoveLiquidityReturn {
  const { address } = useAccount()
  const chainId = useChainId()

  const [error, setError] = useState<Error | null>(null)
  const [burnHash, setBurnHash] = useState<`0x${string}` | undefined>()
  const [collectHash, setCollectHash] = useState<`0x${string}` | undefined>()

  const {
    writeContractAsync,
    isPending,
    data: hash,
  } = useWriteContract()

  const { isSuccess: isConfirmed, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  })

  const removeLiquidity = useCallback(async (params: RemoveLiquidityParams) => {
    if (!address) {
      throw new Error('Account not available')
    }

    try {
      setError(null)

      // 1. Burn liquidity
      const burnTxHash = await writeContractAsync({
        address: params.poolAddress,
        abi: poolAbi,
        functionName: 'burn',
        args: [params.lowerTick, params.upperTick, params.amount],
      })
      setBurnHash(burnTxHash)

      // 2. Collect tokens
      const collectTxHash = await writeContractAsync({
        address: params.poolAddress,
        abi: poolAbi,
        functionName: 'collect',
        args: [
          address,
          params.lowerTick,
          params.upperTick,
          maxUint128,
          maxUint128,
        ],
      })
      setCollectHash(collectTxHash)
    } catch (err) {
      console.error('Remove liquidity failed:', err)
      setError(err instanceof Error ? err : new Error('Remove liquidity failed'))
      throw err
    }
  }, [address, writeContractAsync])

  return {
    removeLiquidity,
    isPending,
    isConfirming,
    isSuccess: isConfirmed,
    error,
    burnHash,
    collectHash,
  }
}

// 获取池子信息
export function usePoolInfo(poolAddress: Address | undefined) {
  const { data: slot0, isLoading: slot0Loading } = useReadContract({
    address: poolAddress,
    abi: poolAbi,
    functionName: 'slot0',
    query: {
      enabled: !!poolAddress,
    },
  })

  const { data: liquidity, isLoading: liquidityLoading } = useReadContract({
    address: poolAddress,
    abi: poolAbi,
    functionName: 'liquidity',
    query: {
      enabled: !!poolAddress,
    },
  })

  const { data: token0, isLoading: token0Loading } = useReadContract({
    address: poolAddress,
    abi: poolAbi,
    functionName: 'token0',
    query: {
      enabled: !!poolAddress,
    },
  })

  const { data: token1, isLoading: token1Loading } = useReadContract({
    address: poolAddress,
    abi: poolAbi,
    functionName: 'token1',
    query: {
      enabled: !!poolAddress,
    },
  })

  return {
    sqrtPriceX96: slot0?.[0],
    tick: slot0?.[1],
    liquidity,
    token0,
    token1,
    isLoading: slot0Loading || liquidityLoading || token0Loading || token1Loading,
  }
}

// 获取池子中的头寸
export function usePoolPosition(
  poolAddress: Address | undefined,
  owner: Address | undefined,
  lowerTick: number,
  upperTick: number
) {
  // 计算头寸 key
  const positionKey = owner && poolAddress
    ? getPositionKey(owner, lowerTick, upperTick)
    : undefined

  const { data, isLoading, refetch } = useReadContract({
    address: poolAddress,
    abi: poolAbi,
    functionName: 'positions',
    args: positionKey ? [positionKey] : undefined,
    query: {
      enabled: !!positionKey && !!poolAddress,
    },
  })

  return {
    liquidity: data?.[0],
    feeGrowthInside0LastX128: data?.[1],
    feeGrowthInside1LastX128: data?.[2],
    tokensOwed0: data?.[3],
    tokensOwed1: data?.[4],
    isLoading,
    refetch,
  }
}

// 计算头寸 key
function getPositionKey(owner: Address, lowerTick: number, upperTick: number): `0x${string}` {
  // keccak256(abi.encodePacked(owner, lowerTick, upperTick))
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters('address, int24, int24'),
      [owner, lowerTick, upperTick]
    )
  )
}