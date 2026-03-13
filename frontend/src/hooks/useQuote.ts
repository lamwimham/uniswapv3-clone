'use client'

import { useAccount, useReadContract, useSimulateContract } from 'wagmi'
import { quoterAbi } from '@/contracts/abis/quoter'
import { Address, parseEther } from 'viem'
import { CONTRACTS } from '@/contracts/addresses'
import { encodePath, PathElement } from '@/lib/pathFinder'
import { useChainId } from 'wagmi'

interface QuoteResult {
  amountOut: bigint | undefined
  sqrtPriceX96AfterList: readonly bigint[] | undefined
  tickAfterList: readonly number[] | undefined
  isLoading: boolean
  error: Error | null
}

export function useQuote(
  path: PathElement[],
  amountIn: string
): QuoteResult {
  const chainId = useChainId()
  const quoterAddress = CONTRACTS[chainId]?.Quoter

  const amountInBigInt = amountIn ? parseEther(amountIn) : 0n
  const encodedPath = path.length > 0 ? encodePath(path) : '0x' as `0x${string}`

  // 使用 simulateContract 来模拟调用 (Quoter 的 quote 方法是非 view 的)
  const { data, isLoading, error } = useSimulateContract({
    address: quoterAddress as Address,
    abi: quoterAbi,
    functionName: 'quote',
    args: [encodedPath, amountInBigInt],
    query: {
      enabled: amountInBigInt > 0n && path.length > 0 && !!quoterAddress,
    },
  })

  return {
    amountOut: data?.result?.[0],
    sqrtPriceX96AfterList: data?.result?.[1],
    tickAfterList: data?.result?.[2],
    isLoading,
    error: error ? (error as Error) : null,
  }
}

// 单跳报价
interface QuoteSingleParams {
  tokenIn: Address
  tokenOut: Address
  fee: number
  amountIn: bigint
  sqrtPriceLimitX96?: bigint
}

export function useQuoteSingle(params: QuoteSingleParams | null) {
  const chainId = useChainId()
  const quoterAddress = CONTRACTS[chainId]?.Quoter

  const { data, isLoading, error } = useSimulateContract({
    address: quoterAddress as Address,
    abi: quoterAbi,
    functionName: 'quoteSingle',
    args: params ? [
      {
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        fee: params.fee,
        amountIn: params.amountIn,
        sqrtPriceLimitX96: params.sqrtPriceLimitX96 ?? 0n,
      }
    ] : undefined,
    query: {
      enabled: !!params && !!quoterAddress,
    },
  })

  return {
    amountOut: data?.result?.[0],
    sqrtPriceX96After: data?.result?.[1],
    tickAfter: data?.result?.[2],
    isLoading,
    error: error ? (error as Error) : null,
  }
}