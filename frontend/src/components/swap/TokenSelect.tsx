'use client'

import { Address } from 'viem'

interface Token {
  address: Address
  symbol: string
}

interface TokenSelectProps {
  tokens: Token[]
  selectedToken: Token | undefined
  onSelect: (token: Token) => void
  disabled?: boolean
  excludeTokens?: Address[]
}

export function TokenSelect({
  tokens,
  selectedToken,
  onSelect,
  disabled = false,
  excludeTokens = [],
}: TokenSelectProps) {
  const filteredTokens = tokens.filter(
    (t) => !excludeTokens.includes(t.address)
  )

  return (
    <select
      value={selectedToken?.address || ''}
      onChange={(e) => {
        const token = tokens.find((t) => t.address === e.target.value)
        if (token) onSelect(token)
      }}
      disabled={disabled}
      className="px-4 py-2 bg-white rounded-xl font-semibold text-sm border border-gray-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-50 cursor-pointer hover:border-gray-300 transition-all"
    >
      {!selectedToken && <option value="">Select token</option>}
      {filteredTokens.map((token) => (
        <option key={token.address} value={token.address}>
          {token.symbol}
        </option>
      ))}
    </select>
  )
}