'use client'

import { useAccount, useReadContract } from 'wagmi'
import { erc20Abi } from '@/contracts/abis/erc20'
import { Address, maxUint256 } from 'viem'

interface UseTokenApprovalParams {
  tokenAddress: Address | undefined
  spender: Address | undefined
  amount: bigint
}

interface UseTokenApprovalReturn {
  allowance: bigint | undefined
  needsApproval: boolean
  isLoading: boolean
}

export function useTokenApproval({
  tokenAddress,
  spender,
  amount,
}: UseTokenApprovalParams): UseTokenApprovalReturn {
  const { address } = useAccount()

  const { data: allowance, isLoading } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && spender ? [address, spender] : undefined,
    query: {
      enabled: !!tokenAddress && !!spender && !!address,
    },
  })

  const needsApproval = allowance ? allowance < amount : amount > 0n

  return {
    allowance: allowance ?? 0n,
    needsApproval,
    isLoading,
  }
}

// 代币余额
export function useTokenBalance(tokenAddress: Address | undefined) {
  const { address } = useAccount()

  const { data: balance, isLoading, refetch } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!tokenAddress && !!address,
    },
  })

  return {
    balance: balance ?? 0n,
    isLoading,
    refetch,
  }
}

// 代币信息
export function useTokenInfo(tokenAddress: Address | undefined) {
  const { data: symbol, isLoading: symbolLoading } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'symbol',
    query: {
      enabled: !!tokenAddress,
    },
  })

  const { data: decimals, isLoading: decimalsLoading } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'decimals',
    query: {
      enabled: !!tokenAddress,
    },
  })

  const { data: name, isLoading: nameLoading } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'name',
    query: {
      enabled: !!tokenAddress,
    },
  })

  return {
    symbol,
    decimals: decimals ?? 18,
    name,
    isLoading: symbolLoading || decimalsLoading || nameLoading,
  }
}