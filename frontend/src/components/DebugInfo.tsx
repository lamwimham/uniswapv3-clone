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
  const [errors, setErrors] = useState<{weth?: string, usdc?: string, factory?: string}>({})

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
        
        // 获取 Factory 合约地址
        const factoryAddress = CONTRACTS[chainId]?.Factory
        
        setDebugInfo({
          account: address,
          ethBalance: formatEther(ethBalance),
          wethBalance: wethBalance ? formatEther(wethBalance) : null,
          wethSymbol: wethSymbol || 'Unknown',
          usdcBalance: usdcBalance ? formatEther(usdcBalance) : null,
          usdcSymbol: usdcSymbol || 'Unknown',
          factoryAddress,
          chainId
        })
        
        setErrors({
          weth: wethError || undefined,
          usdc: usdcError || undefined,
          factory: factoryAddress ? undefined : 'Factory address not configured for this chain'
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
      <h3 className="text-gray-800 font-bold mb-2">调试信息</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
        <div><strong>账户:</strong> {debugInfo.account}</div>
        <div><strong>链 ID:</strong> {debugInfo.chainId}</div>
        <div><strong>ETH 余额:</strong> {debugInfo.ethBalance}</div>
        <div><strong>{debugInfo.wethSymbol} 余额:</strong> {debugInfo.wethBalance || 'Error'}</div>
        <div><strong>{debugInfo.usdcSymbol} 余额:</strong> {debugInfo.usdcBalance || 'Error'}</div>
        <div><strong>Factory 地址:</strong> {debugInfo.factoryAddress || 'Not configured'}</div>
      </div>
      
      {(errors.weth || errors.usdc || errors.factory) && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-xs">
          <h4 className="font-bold text-red-700">错误详情:</h4>
          {errors.weth && <p className="text-red-600"><strong>WETH:</strong> {errors.weth}</p>}
          {errors.usdc && <p className="text-red-600"><strong>USDC:</strong> {errors.usdc}</p>}
          {errors.factory && <p className="text-red-600"><strong>Factory:</strong> {errors.factory}</p>}
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