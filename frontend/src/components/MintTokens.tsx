'use client'

import { useState } from 'react'
import { Address, parseEther } from 'viem'
import { useAccount, useWriteContract } from 'wagmi'
import { CONTRACTS } from '@/contracts/addresses'
import { useChainId } from 'wagmi'

// 临时的ABI，因为可能没有预定义
const mintableErc20Abi = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

export function MintTokens() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [tokenAddress, setTokenAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [isMinting, setIsMinting] = useState(false)

  const { writeContractAsync } = useWriteContract()

  const handleMint = async () => {
    if (!address || !tokenAddress || !amount) return

    setIsMinting(true)
    try {
      await writeContractAsync({
        address: tokenAddress as Address,
        abi: mintableErc20Abi,
        functionName: 'mint',
        args: [address, parseEther(amount)],
      })
    } catch (error) {
      console.error('Error minting tokens:', error)
    } finally {
      setIsMinting(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Mint Tokens</h3>
        <p className="text-gray-500">Connect wallet to mint tokens</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Mint Tokens</h3>
      <p className="text-sm text-gray-500 mb-4">
        Mint test tokens to your account. Use deployed token addresses.
      </p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Token Address
          </label>
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="0x..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount
          </label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <button
          onClick={handleMint}
          disabled={isMinting || !tokenAddress || !amount}
          className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {isMinting ? 'Minting...' : 'Mint Tokens'}
        </button>
      </div>
    </div>
  )
}