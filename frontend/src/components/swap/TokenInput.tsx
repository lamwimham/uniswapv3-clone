'use client'

import { Address } from 'viem'
import { formatTokenAmount, parseTokenAmount } from '@/lib/utils'

interface TokenInputProps {
  value: string
  onChange: (value: string) => void
  tokenSymbol: string
  balance?: bigint
  decimals?: number
  disabled?: boolean
  readOnly?: boolean
  label?: string
}

export function TokenInput({
  value,
  onChange,
  tokenSymbol,
  balance,
  decimals = 18,
  disabled = false,
  readOnly = false,
  label,
}: TokenInputProps) {
  const handleMaxClick = () => {
    if (balance && !readOnly) {
      onChange(formatTokenAmount(balance, decimals))
    }
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-500 mb-2">
          {label}
        </label>
      )}
      <div className="relative group">
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 focus-within:border-blue-300 focus-within:bg-white transition-all">
          <div className="flex-1">
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              readOnly={readOnly}
              className="w-full bg-transparent text-2xl font-semibold outline-none placeholder:text-gray-300 disabled:opacity-50"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="px-4 py-2 bg-white rounded-xl font-semibold text-gray-900 shadow-sm border border-gray-100">
              {tokenSymbol}
            </span>
          </div>
        </div>

        {/* Balance Row */}
        {balance !== undefined && (
          <div className="flex justify-between items-center mt-2 px-1">
            <span className="text-sm text-gray-500">
              Balance: <span className="font-medium text-gray-700">{formatTokenAmount(balance, decimals)}</span>
            </span>
            {!readOnly && balance > 0n && (
              <button
                onClick={handleMaxClick}
                className="text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors"
              >
                MAX
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}