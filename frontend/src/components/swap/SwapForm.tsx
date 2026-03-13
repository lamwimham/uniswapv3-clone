'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { Address, formatEther, parseEther } from 'viem'
import { TokenInput } from './TokenInput'
import { TokenSelect } from './TokenSelect'
import { SlippageControl } from './SlippageControl'
import { usePairs, useTokens, usePath, useQuote, useSwap, useTokenApproval, useTokenBalance } from '@/hooks'
import { CONTRACTS } from '@/contracts/addresses'
import { debounce } from '@/lib/utils'
import { PathElement } from '@/lib/pathFinder'

interface Token {
  address: Address
  symbol: string
}

export function SwapForm() {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()

  // 状态
  const [amountIn, setAmountIn] = useState('')
  const [amountOut, setAmountOut] = useState('')
  const [slippage, setSlippage] = useState(0.5)
  const [tokenIn, setTokenIn] = useState<Token | undefined>()
  const [tokenOut, setTokenOut] = useState<Token | undefined>()

  // Hooks
  const { pairs, isLoading: pairsLoading, pathFinder } = usePairs()
  const tokens = useTokens(pairs)
  const { path, error: pathError } = usePath(
    pathFinder,
    tokenIn?.address,
    tokenOut?.address
  )

  // 报价 (防抖)
  const [debouncedAmountIn, setDebouncedAmountIn] = useState('')
  const debouncedSetAmountIn = useCallback(
    debounce((value: string) => {
      setDebouncedAmountIn(value)
    }, 300),
    []
  )

  useEffect(() => {
    debouncedSetAmountIn(amountIn)
  }, [amountIn, debouncedSetAmountIn])

  const { amountOut: quoteAmountOut, isLoading: quoteLoading } = useQuote(
    path,
    debouncedAmountIn
  )

  useEffect(() => {
    if (quoteAmountOut) {
      setAmountOut(formatEther(quoteAmountOut))
    } else if (!quoteLoading) {
      setAmountOut('')
    }
  }, [quoteAmountOut, quoteLoading])

  // 代币余额和授权
  const { balance: balanceIn } = useTokenBalance(tokenIn?.address)
  const { needsApproval } = useTokenApproval({
    tokenAddress: tokenIn?.address,
    spender: CONTRACTS[chainId]?.Manager,
    amount: amountIn ? parseEther(amountIn) : 0n,
  })

  // Swap
  const { swap, approve, isPending, isConfirming, isSuccess, error: swapError } = useSwap()

  // 初始化代币选择
  useEffect(() => {
    if (tokens.length >= 2 && !tokenIn && !tokenOut) {
      setTokenIn(tokens[0])
      setTokenOut(tokens[1])
    }
  }, [tokens, tokenIn, tokenOut])

  // 处理 Swap
  const handleSwap = async () => {
    if (!tokenIn || !tokenOut || !amountIn || path.length === 0) return

    try {
      const minAmountOut = (parseFloat(amountOut) * (100 - slippage) / 100).toFixed(18)
      await swap({ path, amountIn, minAmountOut })
      setAmountIn('')
      setAmountOut('')
    } catch (err) {
      console.error('Swap failed:', err)
    }
  }

  // 处理授权
  const handleApprove = async () => {
    if (!tokenIn || !amountIn) return
    await approve(tokenIn.address, parseEther(amountIn))
  }

  // 切换方向
  const handleToggleDirection = () => {
    const temp = tokenIn
    setTokenIn(tokenOut)
    setTokenOut(temp)
    setAmountIn(amountOut)
    setAmountOut('')
  }

  // 选择代币
  const handleSelectTokenIn = (token: Token) => {
    if (token.address === tokenOut?.address) setTokenOut(tokenIn)
    setTokenIn(token)
    setAmountOut('')
  }

  const handleSelectTokenOut = (token: Token) => {
    if (token.address === tokenIn?.address) setTokenIn(tokenOut)
    setTokenOut(token)
    setAmountOut('')
  }

  // 状态
  const isLoading = pairsLoading || quoteLoading
  const canSwap = isConnected && !isLoading && amountIn && amountOut && !needsApproval
  const canApprove = isConnected && needsApproval && amountIn
  const isTxPending = isPending || isConfirming

  if (pairsLoading) {
    return (
      <div className="bg-white rounded-3xl shadow-xl p-6 animate-pulse">
        <div className="h-8 w-32 bg-gray-200 rounded mb-6" />
        <div className="space-y-4">
          <div className="h-24 bg-gray-100 rounded-2xl" />
          <div className="h-10 w-10 mx-auto bg-gray-200 rounded-full" />
          <div className="h-24 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Swap</h2>
      </div>

      {tokens.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">💱</span>
          </div>
          <p className="text-gray-500">No trading pairs available</p>
          <p className="text-sm text-gray-400 mt-1">Deploy contracts to get started</p>
        </div>
      ) : (
        <div className="p-6 space-y-2">
          {/* Token In */}
          <TokenInput
            value={amountIn}
            onChange={setAmountIn}
            tokenSymbol={tokenIn?.symbol || 'Select'}
            balance={balanceIn}
            disabled={!isConnected || isLoading}
            label="You pay"
          />
          <TokenSelect
            tokens={tokens}
            selectedToken={tokenIn}
            onSelect={handleSelectTokenIn}
            disabled={isLoading}
            excludeTokens={tokenOut ? [tokenOut.address] : []}
          />

          {/* Toggle Button */}
          <div className="flex justify-center -my-1 relative z-10">
            <button
              onClick={handleToggleDirection}
              disabled={!isConnected || isLoading}
              className="p-3 rounded-xl bg-white border-4 border-gray-50 hover:border-blue-100 hover:bg-blue-50 disabled:opacity-50 transition-all shadow-sm"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* Token Out */}
          <TokenInput
            value={amountOut}
            onChange={() => {}}
            tokenSymbol={tokenOut?.symbol || 'Select'}
            disabled={!isConnected || isLoading}
            readOnly={true}
            label="You receive"
          />
          <TokenSelect
            tokens={tokens}
            selectedToken={tokenOut}
            onSelect={handleSelectTokenOut}
            disabled={isLoading}
            excludeTokens={tokenIn ? [tokenIn.address] : []}
          />

          {/* Slippage */}
          <div className="pt-4">
            <SlippageControl
              value={slippage}
              onChange={setSlippage}
              disabled={!isConnected || isLoading}
            />
          </div>

          {/* Route Info */}
          {path.length > 3 && (
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
              <span className="font-medium">Route:</span>
              <span className="text-gray-700">
                {path.map((p, i) =>
                  i % 2 === 0
                    ? tokens.find(t => t.address === p)?.symbol || '...'
                    : `(${Number(p)/10000}%)`
                ).join(' → ')}
              </span>
            </div>
          )}

          {/* Error */}
          {pathError && (
            <div className="flex items-center gap-2 text-red-500 bg-red-50 rounded-xl px-4 py-3 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {pathError.message}
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            {isConnected && canApprove ? (
              <button
                onClick={handleApprove}
                disabled={isTxPending}
                className="w-full py-4 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white rounded-2xl font-semibold text-lg disabled:opacity-70 transition-all shadow-lg shadow-orange-500/25"
              >
                {isTxPending ? 'Approving...' : `Approve ${tokenIn?.symbol}`}
              </button>
            ) : (
              <button
                onClick={handleSwap}
                disabled={!canSwap || isTxPending || !isConnected}
                className={`w-full py-4 rounded-2xl font-semibold text-lg transition-all ${
                  isSuccess
                    ? 'bg-green-500 text-white'
                    : canSwap
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isTxPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Swapping...
                  </span>
                ) : isSuccess ? (
                  '✓ Success!'
                ) : !isConnected ? (
                  'Connect Wallet to Swap'
                ) : (
                  'Swap'
                )}
              </button>
            )}
          </div>

          {/* Swap Error */}
          {swapError && (
            <div className="text-red-500 text-sm text-center py-2">
              {swapError.message}
            </div>
          )}
        </div>
      )}
    </div>
  )
}