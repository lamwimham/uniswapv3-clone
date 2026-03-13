'use client'

import { formatEther } from 'viem'
import { PoolEvent } from '@/hooks/usePoolEvents'

interface EventsFeedProps {
  events: PoolEvent[]
  isLoading: boolean
  maxEvents?: number
}

function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatAmount(amount: bigint | unknown): string {
  if (typeof amount !== 'bigint') return '0'
  return parseFloat(formatEther(amount)).toFixed(4)
}

function formatTick(tick: unknown): string {
  if (typeof tick === 'number') return tick.toString()
  if (typeof tick === 'bigint') return tick.toString()
  return '?'
}

const eventStyles = {
  Mint: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-500' },
  Burn: { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-500' },
  Swap: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-500' },
  Collect: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-500' },
}

function EventCard({ event }: { event: PoolEvent }) {
  const style = eventStyles[event.type]

  return (
    <div className={`${style.bg} ${style.border} border rounded-xl p-3 animate-fade-in`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-2 py-0.5 text-xs font-bold ${style.badge} text-white rounded-md`}>
          {event.type.toUpperCase()}
        </span>
        <span className="text-xs text-gray-500 font-mono">
          {formatAddress(event.txHash)}
        </span>
      </div>
      <div className="text-sm text-gray-600 space-y-0.5">
        {event.type === 'Swap' ? (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount0:</span>
              <span className="font-medium">{formatAmount(event.data.amount0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount1:</span>
              <span className="font-medium">{formatAmount(event.data.amount1)}</span>
            </div>
          </>
        ) : event.type === 'Mint' ? (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500">Range:</span>
              <span className="font-medium">[{formatTick(event.data.tickLower)}, {formatTick(event.data.tickUpper)}]</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Liquidity:</span>
              <span className="font-medium">{event.data.amount?.toString() || '0'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount0:</span>
              <span className="font-medium">{formatAmount(event.data.amount0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount1:</span>
              <span className="font-medium">{formatAmount(event.data.amount1)}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500">Range:</span>
              <span className="font-medium">[{formatTick(event.data.tickLower)}, {formatTick(event.data.tickUpper)}]</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount:</span>
              <span className="font-medium">{formatAmount(event.data.amount)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function EventsFeed({ events, isLoading, maxEvents = 15 }: EventsFeedProps) {
  const displayEvents = events.slice(0, maxEvents)

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl shadow-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
        <div className="text-center py-8 text-gray-500">
          <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-xl">📊</span>
          </div>
          <p>No events yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
          {events.length} events
        </span>
      </div>
      <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
        {displayEvents.map((event, index) => (
          <EventCard key={`${event.txHash}-${event.logIndex}-${index}`} event={event} />
        ))}
      </div>
    </div>
  )
}