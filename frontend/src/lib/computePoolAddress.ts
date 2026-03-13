import { Address } from 'viem'

// 对两个代币地址排序
export function sortTokens(tokenA: Address, tokenB: Address): [Address, Address] {
  return tokenA.toLowerCase() < tokenB.toLowerCase()
    ? [tokenA, tokenB]
    : [tokenB, tokenA]
}

// 获取池子地址 - 通过工厂合约查询
export async function getPoolAddress(
  publicClient: any,
  factory: Address,
  tokenA: Address,
  tokenB: Address,
  fee: number
): Promise<Address> {
  const [token0, token1] = sortTokens(tokenA, tokenB)

  // 读取工厂合约的 getPool 函数
  const poolAddress = await publicClient.readContract({
    address: factory,
    abi: [
      {
        inputs: [
          { internalType: 'address', name: '', type: 'address' },
          { internalType: 'address', name: '', type: 'address' },
          { internalType: 'uint24', name: '', type: 'uint24' },
        ],
        name: 'getPool',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    functionName: 'getPool',
    args: [token0, token1, fee],
  })

  return poolAddress
}