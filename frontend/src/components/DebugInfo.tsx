'use client'

import { useState, useEffect } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { usePublicClient } from 'wagmi'
import { Address, formatEther } from 'viem'
import { CONTRACTS, TOKEN_SYMBOLS } from '@/contracts/addresses'
import { erc20Abi } from '@/contracts/abis/erc20'

// 调试信息组件
export function DebugInfo() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()

  const [debugInfo, setDebugInfo] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<{weth?: string, usdc?: string}>({})

  useEffect(() => {
    const fetchDebugInfo = async () => {
      if (!address || !publicClient) return

      try {
        setLoading(true)

        // 获取 ETH 余额
        const ethBalance = await publicClient.getBalance({ address })

        // 获取 WETH 余额
        let wethBalance = null
        let wethSymbol = null
        let wethError = null
        if (CONTRACTS[chainId]?.WETH) {
          try {
            wethBalance = await publicClient.readContract({
              address: CONTRACTS[chainId].WETH,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [address],
            })
            wethSymbol = await publicClient.readContract({
              address: CONTRACTS[chainId].WETH,
              abi: erc20Abi,
              functionName: 'symbol',
            })
          } catch (e) {
            wethError = e instanceof Error ? e.message : String(e)
            console.error('WETH error:', e)
          }
        }

        // 获取 USDC 余额
        let usdcBalance = null
        let usdcSymbol = null
        let usdcError = null
        if (CONTRACTS[chainId]?.USDC) {
          try {
            usdcBalance = await publicClient.readContract({
              address: CONTRACTS[chainId].USDC,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [address],
            })
            usdcSymbol = await publicClient.readContract({
              address: CONTRACTS[chainId].USDC,
              abi: erc20Abi,
              functionName: 'symbol',
            })
          } catch (e) {
            usdcError = e instanceof Error ? e.message : String(e)
            console.error('USDC error:', e)
          }
        }

        // 获取所有合约地址
        const contracts = CONTRACTS[chainId]

        setDebugInfo({
          account: address,
          ethBalance: formatEther(ethBalance),
          wethBalance: wethBalance ? formatEther(wethBalance) : null,
          wethSymbol: wethSymbol || 'Unknown',
          usdcBalance: usdcBalance ? formatEther(usdcBalance) : null,
          usdcSymbol: usdcSymbol || 'Unknown',
          chainId,
          // 所有合约地址
          contracts: contracts ? {
            WETH: contracts.WETH,
            USDC: contracts.USDC,
            Factory: contracts.Factory,
            Manager: contracts.Manager,
            Quoter: contracts.Quoter,
            pools: contracts.pools || [],
          } : null
        })

        setErrors({
          weth: wethError || undefined,
          usdc: usdcError || undefined,
        })
      } catch (error) {
        console.error('Debug info error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDebugInfo()
  }, [address, chainId, publicClient])

  // 使用客户端状态来避免hydration问题
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 在客户端挂载之前显示占位符
  if (!mounted) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 animate-pulse">
        <h3 className="text-gray-800 font-bold mb-2">调试信息</h3>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <h3 className="text-red-800 font-bold">钱包未连接</h3>
        <p className="text-red-600">请连接钱包以查看调试信息</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h3 className="text-blue-800 font-bold">加载中...</h3>
        <p className="text-blue-600">正在获取调试信息</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
      <h3 className="text-gray-800 font-bold mb-3">调试信息</h3>
      
      {/* 账户信息 */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">账户信息</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div><strong>账户:</strong> <span className="font-mono text-xs">{debugInfo.account}</span></div>
          <div><strong>链 ID:</strong> {debugInfo.chainId}</div>
          <div><strong>ETH 余额:</strong> {debugInfo.ethBalance}</div>
          <div><strong>{debugInfo.wethSymbol} 余额:</strong> {debugInfo.wethBalance || 'Error'}</div>
          <div><strong>{debugInfo.usdcSymbol} 余额:</strong> {debugInfo.usdcBalance || 'Error'}</div>
        </div>
      </div>

      {/* 合约地址 */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">合约地址</h4>
        {debugInfo.contracts ? (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-1 gap-1">
              <div><strong>WETH:</strong> <span className="font-mono text-xs text-blue-600">{debugInfo.contracts.WETH}</span></div>
              <div><strong>USDC:</strong> <span className="font-mono text-xs text-blue-600">{debugInfo.contracts.USDC}</span></div>
              <div><strong>Factory:</strong> <span className="font-mono text-xs text-green-600">{debugInfo.contracts.Factory}</span></div>
              <div><strong>Manager:</strong> <span className="font-mono text-xs text-green-600">{debugInfo.contracts.Manager}</span></div>
              <div><strong>Quoter:</strong> <span className="font-mono text-xs text-purple-600">{debugInfo.contracts.Quoter}</span></div>
            </div>
            
            {/* 池子地址 */}
            {debugInfo.contracts.pools && debugInfo.contracts.pools.length > 0 && (
              <div className="mt-3">
                <strong className="text-gray-700">已知池子:</strong>
                <div className="mt-2 space-y-2">
                  {debugInfo.contracts.pools.map((pool: any, index: number) => (
                    <div key={index} className="bg-white border border-gray-200 rounded p-2 text-xs">
                      <div><strong>Pool:</strong> <span className="font-mono text-orange-600">{pool.pool}</span></div>
                      <div><strong>Token0:</strong> <span className="font-mono">{pool.token0}</span></div>
                      <div><strong>Token1:</strong> <span className="font-mono">{pool.token1}</span></div>
                      <div><strong>Fee:</strong> {pool.fee / 10000}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-red-600 text-sm">当前链未配置合约地址</div>
        )}
      </div>

      {/* 错误信息 */}
      {(errors.weth || errors.usdc) && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-xs">
          <h4 className="font-bold text-red-700">错误详情:</h4>
          {errors.weth && <p className="text-red-600"><strong>WETH:</strong> {errors.weth}</p>}
          {errors.usdc && <p className="text-red-600"><strong>USDC:</strong> {errors.usdc}</p>}
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500">
        <p><strong>问题排查提示:</strong></p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>检查合约是否已在当前链上正确部署</li>
          <li>验证合约地址是否与实际部署地址匹配</li>
          <li>确保 ABI 与合约实现兼容</li>
          <li>检查钱包是否有足够的代币余额</li>
        </ul>
      </div>
    </div>
  )
}