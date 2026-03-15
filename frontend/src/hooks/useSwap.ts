'use client'

import { useCallback, useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { managerAbi } from '@/contracts/abis/manager'
import { erc20Abi } from '@/contracts/abis/erc20'
import { Address, maxUint256, parseEther, encodeAbiParameters } from 'viem'
import { CONTRACTS } from '@/contracts/addresses'
import { useChainId } from 'wagmi'

interface SwapParams {
  poolAddress: Address
  tokenIn: Address
  tokenOut: Address
  fee: number
  amountIn: string
  minAmountOut: string
}

interface UseSwapReturn {
  swap: (params: SwapParams) => Promise<void>
  approve: (tokenAddress: Address, amount: bigint) => Promise<`0x${string}`>
  isPending: boolean
  isConfirming: boolean
  isSuccess: boolean
  error: Error | null
  hash: `0x${string}` | undefined
  approveHash: `0x${string}` | undefined
}

export function useSwap(): UseSwapReturn {
  const { address } = useAccount()
  const chainId = useChainId()
  const managerAddress = CONTRACTS[chainId]?.Manager

  const [error, setError] = useState<Error | null>(null)
  const [approveHash, setApproveHash] = useState<`0x${string}` | undefined>()
  const [swapHash, setSwapHash] = useState<`0x${string}` | undefined>()

  const { writeContractAsync } = useWriteContract()

  const { isSuccess: isConfirmed, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: swapHash,
  })

  const approve = useCallback(async (tokenAddress: Address, amount: bigint) => {
    if (!managerAddress) {
      throw new Error('Manager address not configured')
    }

    try {
      setError(null)
      const txHash = await writeContractAsync({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [managerAddress, amount > 0n ? amount : maxUint256],
        gas: 100000n,
      })
      setApproveHash(txHash)
      return txHash
    } catch (err) {
      console.error('Approve failed:', err)
      setError(err instanceof Error ? err : new Error('Approve failed'))
      throw err
    }
  }, [managerAddress, writeContractAsync])

  const swap = useCallback(async (params: SwapParams) => {
    if (!managerAddress || !address) {
      throw new Error('Manager address or account not available')
    }

    try {
      setError(null)

      const amountInBigInt = parseEther(params.amountIn)

      // 从 Pool 获取正确的 token0 和 token1
      // Pool 的 token0 是地址较小的那个（按十六进制数值比较）
      const tokenInLower = params.tokenIn.toLowerCase() as Address
      const tokenOutLower = params.tokenOut.toLowerCase() as Address
      const poolToken0 = tokenInLower < tokenOutLower ? params.tokenIn : params.tokenOut
      const poolToken1 = tokenInLower < tokenOutLower ? params.tokenOut : params.tokenIn

      // 确定交换方向
      // zeroForOne = true: 用 token0 换 token1
      // zeroForOne = false: 用 token1 换 token0
      const zeroForOne = params.tokenIn.toLowerCase() === poolToken0.toLowerCase()

      // 构建回调数据 (token0, token1, player)
      // 必须使用 Pool 的 token0 和 token1 顺序
      const data = encodeAbiParameters(
        [
          { name: 'token0', type: 'address' },
          { name: 'token1', type: 'address' },
          { name: 'player', type: 'address' }
        ],
        [poolToken0, poolToken1, address]
      ) as `0x${string}`

      // amountSpecified 是 uint256 类型
      const amountSpecified = amountInBigInt

      const txHash = await writeContractAsync({
        address: managerAddress,
        abi: managerAbi,
        functionName: 'swap',
        args: [
          params.poolAddress,
          zeroForOne,
          amountSpecified,
          data
        ],
        gas: 500000n,
      })
      setSwapHash(txHash)
    } catch (err) {
      console.error('Swap failed:', err)
      setError(err instanceof Error ? err : new Error('Swap failed'))
      throw err
    }
  }, [managerAddress, address, writeContractAsync])

  return {
    swap,
    approve,
    isPending: isConfirming,
    isConfirming,
    isSuccess: isConfirmed,
    error,
    hash: swapHash,
    approveHash,
  }
}