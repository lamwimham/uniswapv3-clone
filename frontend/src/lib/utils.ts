// 防抖函数
export function debounce<T extends any[]>(
  fn: (...args: T) => void,
  timeout = 300
): (...args: T) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: T) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), timeout)
  }
}

// 格式化代币金额
export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  const divisor = BigInt(10) ** BigInt(decimals)
  const whole = amount / divisor
  const remainder = amount % divisor
  const remainderStr = remainder.toString().padStart(decimals, '0').slice(0, 6)
  return `${whole}.${remainderStr}`.replace(/\.?0+$/, '')
}

// 格式化地址 (缩短显示)
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// 解析代币金额
export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  const [whole, fraction = ''] = amount.split('.')
  const fractionPadded = fraction.padEnd(decimals, '0').slice(0, decimals)
  return BigInt(whole + fractionPadded)
}

// 格式化平方根价格
export function formatSqrtPriceX96(sqrtPriceX96: bigint, token0Decimals: number, token1Decimals: number): number {
  // 将 sqrtPriceX96 转换为实际价格
  // sqrtPriceX96 是 (token1/token0)^(1/2) 的 Q64.96 编码
  // 价格 = (sqrtPriceX96^2) / 2^(96*2) * 10^(token1Decimals-token0Decimals)
  
  const sqrtPriceX96Float = Number(sqrtPriceX96) / Number(2n ** 96n)
  const price = sqrtPriceX96Float * sqrtPriceX96Float
  const decimalAdjustment = Math.pow(10, token1Decimals - token0Decimals)
  
  return price * decimalAdjustment
}