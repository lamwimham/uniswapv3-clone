'use client'

import { useState, useEffect } from 'react'

interface SlippageControlProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

const PRESET_VALUES = [0.1, 0.5, 1.0]

export function SlippageControl({
  value,
  onChange,
  disabled = false,
}: SlippageControlProps) {
  const [customValue, setCustomValue] = useState('')
  const [isCustom, setIsCustom] = useState(false)

  const handlePresetClick = (preset: number) => {
    setIsCustom(false)
    onChange(preset)
  }

  const handleCustomChange = (inputValue: string) => {
    setCustomValue(inputValue)
    const parsed = parseFloat(inputValue)
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      onChange(parsed)
    } else if (inputValue === '') {
      setCustomValue('')
    }
  }

  return (
    <div className="flex items-center gap-3 py-3 px-4 bg-gray-50 rounded-xl">
      <span className="text-sm font-medium text-gray-600">Slippage</span>
      <div className="flex items-center gap-1.5">
        {PRESET_VALUES.map((preset) => (
          <button
            key={preset}
            onClick={() => handlePresetClick(preset)}
            disabled={disabled}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              !isCustom && value === preset
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            } disabled:opacity-50`}
          >
            {preset}%
          </button>
        ))}
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={isCustom ? customValue : ''}
            onChange={(e) => handleCustomChange(e.target.value)}
            onFocus={() => setIsCustom(true)}
            disabled={disabled}
            placeholder="Custom"
            className="w-20 px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-center outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
          />
          <span className="text-gray-500">%</span>
        </div>
      </div>
    </div>
  )
}