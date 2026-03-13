'use client'

import { useState, useEffect, ReactNode } from 'react'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { SwapForm } from '@/components/swap/SwapForm'
import { AddLiquidityForm, RemoveLiquidityForm, PoolInfo } from '@/components/liquidity'
import { EventsPanel } from '@/components/events'
import { UserPositions } from '@/components/liquidity/UserPositions'
import { MintTokens } from '@/components/MintTokens'
import { DebugInfo } from '@/components/DebugInfo'
import { useAccount, useChainId } from 'wagmi'
import { Address } from 'viem'
import { usePairs, useTokens } from '@/hooks'
import { getPoolAddress } from '@/lib/getPoolAddress'
import { CONTRACTS } from '@/contracts/addresses'

type Tab = 'swap' | 'add' | 'remove'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('swap')
  const [selectedPairIndex, setSelectedPairIndex] = useState(0)

  const { isConnected } = useAccount()
  const chainId = useChainId()

  useEffect(() => {
    setMounted(true)
  }, [])

  const { pairs } = usePairs()
  const tokens = useTokens(pairs)

  // Get selected pair for liquidity forms
  const selectedPair = pairs[selectedPairIndex]
  const token0 = selectedPair ? { address: selectedPair.token0.address, symbol: selectedPair.token0.symbol } : undefined
  const token1 = selectedPair ? { address: selectedPair.token1.address, symbol: selectedPair.token1.symbol } : undefined
  const fee = selectedPair?.fee ?? 3000

  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    {
      id: 'swap',
      label: 'Swap',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
    {
      id: 'add',
      label: 'Add Liquidity',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
    },
    {
      id: 'remove',
      label: 'Remove Liquidity',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      ),
    },
  ]

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                <span className="text-white font-bold text-lg">V3</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Uniswap V3 Clone</h1>
                <p className="text-xs text-gray-500">Decentralized Trading</p>
              </div>
            </div>

            {/* Navigation Tabs - Desktop */}
            <nav className="hidden md:flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Connect Button */}
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Mobile Tabs */}
      <div className="md:hidden sticky top-16 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium text-sm transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600 bg-purple-50/50'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Bar - Desktop */}
        {isConnected && pairs.length > 0 && (
          <div className="hidden lg:block mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-sm text-gray-500">Total Pools</p>
                    <p className="text-2xl font-bold text-gray-900">{pairs.length}</p>
                  </div>
                  <div className="h-12 w-px bg-gray-200" />
                  <div>
                    <p className="text-sm text-gray-500">Available Tokens</p>
                    <p className="text-2xl font-bold text-gray-900">{tokens.length}</p>
                  </div>
                  <div className="h-12 w-px bg-gray-200" />
                  <div>
                    <p className="text-sm text-gray-500">Network</p>
                    <p className="text-2xl font-bold text-gray-900 capitalize">
                      {chainId === 31337 ? 'Localhost' : chainId === 11155111 ? 'Sepolia' : chainId === 1 ? 'Mainnet' : 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Live</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {!mounted ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl shadow-xl p-6 animate-pulse">
                <div className="h-8 w-32 bg-gray-200 rounded mb-6" />
                <div className="space-y-4">
                  <div className="h-24 bg-gray-100 rounded-2xl" />
                  <div className="h-10 w-10 mx-auto bg-gray-200 rounded-full" />
                  <div className="h-24 bg-gray-100 rounded-2xl" />
                </div>
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl shadow-xl p-6 animate-pulse">
                <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded-xl" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Main Action */}
              <div className="lg:col-span-2 space-y-6">
                {/* Pair Selector for Liquidity */}
                {(activeTab === 'add' || activeTab === 'remove') && pairs.length > 1 && (
                  <div className="bg-white rounded-2xl shadow-lg p-4">
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      Select Pool
                    </label>
                    <select
                      value={selectedPairIndex}
                      onChange={(e) => setSelectedPairIndex(Number(e.target.value))}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-300 transition-all"
                    >
                      {pairs.map((pair, idx) => (
                        <option key={pair.address} value={idx}>
                          {pair.token0.symbol}/{pair.token1.symbol} ({pair.fee / 10000}%)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Main Form */}
                <div className="transition-all duration-300">
                  {activeTab === 'swap' && <SwapForm />}
                  {activeTab === 'add' && token0 && token1 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <AddLiquidityForm token0={token0} token1={token1} fee={fee} />
                      <PoolInfo poolAddress={
                        selectedPair ? selectedPair.address : undefined
                      } />
                    </div>
                  )}
                  {activeTab === 'remove' && token0 && token1 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <RemoveLiquidityForm token0={token0} token1={token1} fee={fee} />
                      <PoolInfo poolAddress={
                        selectedPair ? selectedPair.address : undefined
                      } />
                    </div>
                  )}
                </div>

                {/* Info Cards - Desktop */}
                <div className="hidden lg:grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl shadow-lg p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-900">Fast Swaps</h3>
                    </div>
                    <p className="text-sm text-gray-500">Optimized routing for best prices across multiple pools</p>
                  </div>

                  <div className="bg-white rounded-2xl shadow-lg p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-900">Secure</h3>
                    </div>
                    <p className="text-sm text-gray-500">Non-custodial trading with audited smart contracts</p>
                  </div>

                  <div className="bg-white rounded-2xl shadow-lg p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-900">Low Fees</h3>
                    </div>
                    <p className="text-sm text-gray-500">Concentrated liquidity for capital efficiency</p>
                  </div>
                </div>
              </div>

              {/* Right Column - Events Sidebar */}
              <div className="lg:col-span-1">
                <div className="lg:sticky lg:top-24 space-y-6">
                  <UserPositions />
                  <MintTokens />
                  <EventsPanel />
                </div>
              </div>
            </div>

            {/* Debug Info */}
            <div className="mt-8">
              <DebugInfo />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-gray-100 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span>Built with</span>
              <span className="font-semibold text-gray-700">Next.js</span>
              <span>+</span>
              <span className="font-semibold text-gray-700">wagmi</span>
              <span>+</span>
              <span className="font-semibold text-gray-700">viem</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>Uniswap V3 Clone</span>
              <span>•</span>
              <span>Decentralized Exchange</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}