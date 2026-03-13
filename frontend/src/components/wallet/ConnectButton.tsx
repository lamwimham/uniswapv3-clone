'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useBalance, useChainId } from 'wagmi'
import { formatAddress } from '@/lib/utils'

const chainNames: Record<number, string> = {
  31337: 'Anvil',
  1: 'Mainnet',
  11155111: 'Sepolia',
}

const chainColors: Record<number, string> = {
  31337: 'bg-yellow-100 text-yellow-800',
  1: 'bg-blue-100 text-blue-800',
  11155111: 'bg-purple-100 text-purple-800',
}

export function ConnectButton() {
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: balance } = useBalance({ address })
  const chainId = useChainId()

  // 使用客户端状态来避免hydration问题
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 在客户端渲染之前显示占位符
  if (!mounted) {
    return (
      <div className="flex items-center gap-3">
        <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Unknown
        </span>
        <div className="w-32 h-8 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        {/* Chain Badge */}
        <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${chainId ? chainColors[chainId] : 'bg-gray-100 text-gray-800'}`}>
          {chainId ? chainNames[chainId] : 'Unknown'}
        </span>

        {/* Balance */}
        {balance && (
          <span className="hidden sm:block text-sm text-gray-600">
            {parseFloat(balance.value.toString()).toFixed(4)} {balance.symbol}
          </span>
        )}

        {/* Address */}
        <button
          onClick={() => disconnect()}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors group"
        >
          <span className="font-mono text-sm">{formatAddress(address)}</span>
          <span className="text-xs text-gray-400 group-hover:text-red-500 transition-colors">
            Disconnect
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => connect({ connector })}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-blue-500/25"
        >
          Connect Wallet
        </button>
      ))}
    </div>
  )
}