'use client'

import { useCallback, useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { managerAbi } from '@/contracts/abis/manager'
import { erc20Abi } from '@/contracts/abis/erc20'
import { Address, maxUint256, parseEther } from 'viem'
import { CONTRACTS } from '@/contracts/addresses'
import { useChainId } from 'wagmi'

interface MintParams {
  poolAddress: Address
  lowerTick: number
  upperTick: number
  liquidity: bigint
  data: `0x${string}`
}

interface UseAddLiquidityReturn {
  mint: (params: MintParams) => Promise<void>
  approve: (tokenAddress: Address, amount: bigint, spenderAddress: Address) => Promise<`0x${string}`>
  isPending: boolean
  isConfirming: boolean
  isSuccess: boolean
  error: Error | null
  hash: `0x${string}` | undefined
}

export function useAddLiquidity(): UseAddLiquidityReturn {
  const { address } = useAccount()
  const chainId = useChainId()
  const managerAddress = CONTRACTS[chainId]?.Manager

  const [error, setError] = useState<Error | null>(null)

  const {
    writeContractAsync,
    isPending,
    data: hash,
  } = useWriteContract()

  const { isSuccess: isConfirmed, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  })

  const approve = useCallback(async (tokenAddress: Address, amount: bigint, spenderAddress: Address) => {
    if (!spenderAddress) {
      throw new Error('Spender address not provided')
    }

    try {
      setError(null)
      const txHash = await writeContractAsync({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spenderAddress, amount > 0n ? amount : maxUint256],
        gas: 100000n,
      })
      return txHash
    } catch (err) {
      console.error('Approve failed:', err)
      setError(err instanceof Error ? err : new Error('Approve failed'))
      throw err
    }
  }, [writeContractAsync])

  const mint = useCallback(async (params: MintParams) => {
    if (!managerAddress || !address) {
      throw new Error('Manager address or account not available')
    }

    try {
      setError(null)

      await writeContractAsync({
        address: managerAddress,
        abi: managerAbi,
        functionName: 'mint',
        args: [
          params.poolAddress,
          params.lowerTick,
          params.upperTick,
          params.liquidity,
          params.data
        ],
        gas: 600000n,
      })
    } catch (err) {
      console.error('Mint failed:', err)
      setError(err instanceof Error ? err : new Error('Mint failed'))
      throw err
    }
  }, [managerAddress, address, writeContractAsync])

  return {
    mint,
    approve,
    isPending,
    isConfirming,
    isSuccess: isConfirmed,
    error,
    hash,
  }
}

// 获取头寸信息 - 由于实际合约没有 getPosition 函数，暂时保留此函数但注释掉
/*
interface GetPositionParams {
  tokenA: Address
  tokenB: Address
  fee: number
  owner: Address
  lowerTick: number
  upperTick: number
}

export function usePosition(params: GetPositionParams | null) {
  const chainId = useChainId()
  const managerAddress = CONTRACTS[chainId]?.Manager

  const { data, isLoading, refetch } = useReadContract({
    address: managerAddress,
    abi: managerAbi,
    functionName: 'getPosition',
    args: params ? [
      {
        tokenA: params.tokenA,
        tokenB: params.tokenB,
        fee: params.fee,
        owner: params.owner,
        lowerTick: params.lowerTick,
        upperTick: params.upperTick,
      }
    ] : undefined,
    query: {
      enabled: !!params && !!managerAddress,
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
*/