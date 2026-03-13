import { getCreate2Address, keccak256, encodeAbiParameters, parseAbiParameters } from 'viem'

// 对两个代币地址排序
function sortTokens(tokenA: string, tokenB: string): [string, string] {
  return tokenA.toLowerCase() < tokenB.toLowerCase()
    ? [tokenA, tokenB]
    : [tokenB, tokenA]
}

// 计算 CREATE2 池地址
function computePoolAddress(
  factory: string,
  tokenA: string,
  tokenB: string,
  fee: number
): string {
  const [token0, token1] = sortTokens(tokenA, tokenB)

  // 对 token0, token1, fee 进行编码
  const salt = keccak256(
    encodeAbiParameters(
      parseAbiParameters('address, address, uint24'),
      [token0, token1, fee]
    )
  )

  // 这里需要使用正确的 POOL_CODE_HASH
  const POOL_CODE_HASH = '0x9dc805423bd1664a6a73b31955de538c338bac1f5c61beb8f4635be5032076a2' // 当前硬编码值

  return getCreate2Address({
    from: factory as `0x${string}`,
    bytecodeHash: POOL_CODE_HASH as `0x${string}`,
    salt,
  })
}

// 实际部署的地址
const actualPoolAddress = '0x75537828f2ce51be7289709686a69cbfdbb714f1'
const factoryAddress = '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0'
const token0Address = '0x5fbdb2315678afecb367f032d93f642f64180aa3' // WETH
const token1Address = '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512' // USDC
const fee = 3000

console.log('实际部署的池子地址:', actualPoolAddress)
console.log('WETH 地址:', token0Address)
console.log('USDC 地址:', token1Address)
console.log('Factory 地址:', factoryAddress)
console.log('费用等级:', fee)

const computedPoolAddress = computePoolAddress(factoryAddress, token0Address, token1Address, fee)
console.log('计算出的池子地址:', computedPoolAddress)

console.log('地址是否匹配:', actualPoolAddress.toLowerCase() === computedPoolAddress.toLowerCase())

// 如果地址不匹配，说明 POOL_CODE_HASH 不正确
if (actualPoolAddress.toLowerCase() !== computedPoolAddress.toLowerCase()) {
  console.log('错误：计算出的地址与实际部署的地址不匹配！')
  console.log('需要更新 POOL_CODE_HASH 值')
} else {
  console.log('成功：计算出的地址与实际部署的地址匹配')
}