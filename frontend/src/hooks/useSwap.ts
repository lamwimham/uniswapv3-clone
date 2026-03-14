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

  const {
    writeContractAsync,
    isPending,
    data: hash,
  } = useWriteContract()

  const { isSuccess: isConfirmed, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
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

      // 确定交换方向：zeroForOne = tokenIn < tokenOut
      const zeroForOne = params.tokenIn < params.tokenOut

      // 构建回调数据 (token0, token1, player)
      // 注意：token0 和 token1 需要按地址排序
      const token0 = params.tokenIn < params.tokenOut ? params.tokenIn : params.tokenOut
      const token1 = params.tokenIn < params.tokenOut ? params.tokenOut : params.tokenIn

      const data = encodeAbiParameters(
        [
          { name: 'token0', type: 'address' },
          { name: 'token1', type: 'address' },
          { name: 'player', type: 'address' }
        ],
        [token0, token1, address]
      ) as `0x${string}`

      // amountSpecified 是 int256 类型，传入正数表示输入金额
      const amountSpecified = BigInt(amountInBigInt.toString())

      await writeContractAsync({
        address: managerAddress,
        abi: managerAbi,
        functionName: 'swap',
        args: [
          params.poolAddress,
          zeroForOne,
          amountSpecified,
          data
        ],
      })
    } catch (err) {
      console.error('Swap failed:', err)
      setError(err instanceof Error ? err : new Error('Swap failed'))
      throw err
    }
  }, [managerAddress, address, writeContractAsync])

  return {
    swap,
    approve,
    isPending,
    isConfirming,
    isSuccess: isConfirmed,
    error,
    hash,
    approveHash,
  }
}