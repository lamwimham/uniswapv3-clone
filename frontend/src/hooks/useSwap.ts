'use client'

import { useCallback, useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { managerAbi } from '@/contracts/abis/manager'
import { erc20Abi } from '@/contracts/abis/erc20'
import { Address, maxUint256, parseEther, encodeAbiParameters } from 'viem'
import { CONTRACTS } from '@/contracts/addresses'
import { encodePath, PathElement } from '@/lib/pathFinder'
import { getPoolAddress } from '@/lib/getPoolAddress'
import { useChainId } from 'wagmi'

interface SwapParams {
  path: PathElement[]
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

      const encodedPath = encodePath(params.path)
      const amountInBigInt = parseEther(params.amountIn)
      const minAmountOutBigInt = parseEther(params.minAmountOut)

      // 从路径中提取代币地址 - 路径格式为 [tokenA, fee, tokenB, fee, tokenC, ...]
      // 第一个元素是起始代币，最后一个元素是结束代币
      const tokenInAddress = params.path[0] as Address
      const tokenOutAddress = params.path[params.path.length - 1] as Address

      // 构建回调数据 (tokenIn, tokenOut, player 地址)
      // player 是用户地址，用于从用户账户转移 token 到池子
      const data = encodeAbiParameters(
        [
          { name: 'token0', type: 'address' },
          { name: 'token1', type: 'address' },
          { name: 'player', type: 'address' }
        ],
        [tokenInAddress, tokenOutAddress, address]
      ) as `0x${string}`

      // 注意：这里需要使用工厂合约和代币地址计算池子地址
      // 但实际的 swap 函数可能需要不同的实现
      // 由于 Manager 合约的 swap 函数可能需要直接的池子地址，我们暂时使用硬编码的池子地址
      // 后续需要根据实际合约实现来调整
      // 注意：这里使用 getPoolAddress 函数，它需要 publicClient，但我们没有
      // 所以暂时使用一个占位符，实际实现需要从工厂合约获取池子地址
      // const poolAddress = await getPoolAddress(publicClient, factoryAddress, tokenInAddress, tokenOutAddress, params.fee)
      // 临时使用一个占位符地址，实际实现需要从工厂合约获取池子地址
      const poolAddress = '0x0000000000000000000000000000000000000000' as Address // 临时占位符

      await writeContractAsync({
        address: managerAddress,
        abi: managerAbi,
        functionName: 'swap',
        args: [
          poolAddress,
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