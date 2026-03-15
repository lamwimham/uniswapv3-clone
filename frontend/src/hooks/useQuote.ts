'use client'

import { useReadContract } from 'wagmi'
import { quoterAbi } from '@/contracts/abis/quoter'
import { Address, parseEther } from 'viem'
import { CONTRACTS } from '@/contracts/addresses'
import { useChainId } from 'wagmi'

interface QuoteResult {
  amountOut: bigint | undefined
  sqrtPriceX96After: bigint | undefined
  tickAfter: number | undefined
  isLoading: boolean
  error: Error | null
}

/**
 * 使用池子地址报价
 */
export function useQuoteByPool(
  poolAddress: Address | undefined,
  zeroForOne: boolean,
  amountIn: string
): QuoteResult {
  const chainId = useChainId()
  const quoterAddress = CONTRACTS[chainId]?.Quoter

  const amountInBigInt = amountIn ? parseEther(amountIn) : 0n

  const { data, isLoading, error } = useReadContract({
    address: quoterAddress as Address,
    abi: quoterAbi,
    functionName: 'quoteStatic',
    args: [poolAddress!, zeroForOne, amountInBigInt],
    query: {
      enabled: amountInBigInt > 0n && !!poolAddress && !!quoterAddress,
    },
  })

  return {
    amountOut: data?.[0],
    sqrtPriceX96After: data?.[1],
    tickAfter: data?.[2],
    isLoading,
    error: error ? (error as Error) : null,
  }
}

/**
 * 使用代币地址报价
 */
export function useQuoteByTokens(
  tokenIn: Address | undefined,
  tokenOut: Address | undefined,
  fee: number,
  amountIn: string
): QuoteResult & { poolAddress: Address | undefined } {
  const chainId = useChainId()
  const quoterAddress = CONTRACTS[chainId]?.Quoter
  const factoryAddress = CONTRACTS[chainId]?.Factory

  const amountInBigInt = amountIn ? parseEther(amountIn) : 0n

  const { data, isLoading, error } = useReadContract({
    address: quoterAddress as Address,
    abi: quoterAbi,
    functionName: 'quoteByTokens',
    args: [factoryAddress!, tokenIn!, tokenOut!, fee, amountInBigInt],
    query: {
      enabled:
        amountInBigInt > 0n &&
        !!tokenIn &&
        !!tokenOut &&
        !!factoryAddress &&
        !!quoterAddress,
    },
  })

  return {
    amountOut: data?.[0],
    poolAddress: data?.[1],
    sqrtPriceX96After: undefined,
    tickAfter: undefined,
    isLoading,
    error: error ? (error as Error) : null,
  }
}