'use client'

interface PriceRangeProps {
  lowerPrice: string
  upperPrice: string
  onLowerPriceChange: (value: string) => void
  onUpperPriceChange: (value: string) => void
  disabled?: boolean
  currentPrice?: string
}

export function PriceRange({
  lowerPrice,
  upperPrice,
  onLowerPriceChange,
  onUpperPriceChange,
  disabled = false,
  currentPrice,
}: PriceRangeProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700">
          Price Range
        </label>
        {currentPrice && (
          <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
            Current: {currentPrice}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <label className="absolute top-2 left-3 text-xs text-gray-400">Min Price</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={lowerPrice}
            onChange={(e) => onLowerPriceChange(e.target.value)}
            disabled={disabled}
            className="w-full pt-7 pb-3 px-3 bg-gray-50 rounded-xl text-lg font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-50 transition-all"
          />
        </div>

        <div className="relative">
          <label className="absolute top-2 left-3 text-xs text-gray-400">Max Price</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={upperPrice}
            onChange={(e) => onUpperPriceChange(e.target.value)}
            disabled={disabled}
            className="w-full pt-7 pb-3 px-3 bg-gray-50 rounded-xl text-lg font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-50 transition-all"
          />
        </div>
      </div>
    </div>
  )
}