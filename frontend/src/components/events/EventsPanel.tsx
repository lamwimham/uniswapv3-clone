'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { Address } from 'viem'
import { EventsFeed } from '@/components/events'
import { usePoolEvents, usePairs } from '@/hooks'

export function EventsPanel() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const [selectedPool, setSelectedPool] = useState<Address | undefined>()

  // 获取交易对
  const { pairs } = usePairs()

  // 计算第一个池的地址用于事件监听
  const poolAddress = useMemo(() => {
    if (selectedPool) return selectedPool
    if (pairs.length > 0) return pairs[0].address
    return undefined
  }, [selectedPool, pairs])

  // 监听事件
  const { events, isLoading } = usePoolEvents({
    poolAddress,
    enabled: isConnected,
  })

  if (!isConnected) {
    return (
      <div className="bg-white rounded-3xl shadow-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
        <div className="text-center py-8 text-gray-500">
          <p>Connect wallet to view events</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 池子选择器 */}
      {pairs.length > 1 && (
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Select Pool
          </label>
          <select
            value={selectedPool || ''}
            onChange={(e) => setSelectedPool(e.target.value as Address || undefined)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
          >
            {pairs.map((pair) => (
              <option key={pair.address} value={pair.address}>
                {pair.token0.symbol}/{pair.token1.symbol} ({pair.fee / 10000}%)
              </option>
            ))}
          </select>
        </div>
      )}

      <EventsFeed events={events} isLoading={isLoading} />
    </div>
  )
}