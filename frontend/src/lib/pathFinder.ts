import createGraph from 'ngraph.graph'
import path from 'ngraph.path'
import { Address, encodeAbiParameters, parseAbiParameters } from 'viem'

export interface Pair {
  token0: { address: Address; symbol: string }
  token1: { address: Address; symbol: string }
  fee: number
  address: Address
}

export type PathElement = Address | number

export class PathFinder {
  private graph: ReturnType<typeof createGraph>
  private finder: ReturnType<typeof path.aStar>

  constructor(pairs: Pair[]) {
    this.graph = createGraph()

    pairs.forEach((pair) => {
      this.graph.addNode(pair.token0.address)
      this.graph.addNode(pair.token1.address)
      this.graph.addLink(pair.token0.address, pair.token1.address, pair.fee)
      this.graph.addLink(pair.token1.address, pair.token0.address, pair.fee)
    })

    this.finder = path.aStar(this.graph)
  }

  findPath(fromToken: Address, toToken: Address): PathElement[] {
    const result = this.finder.find(fromToken, toToken)
    if (result.length === 0) {
      throw new Error('No path found')
    }

    const path: PathElement[] = []
    const nodes = result.reverse()

    nodes.forEach((node, i) => {
      if (i > 0) {
        const prevNode = nodes[i - 1]
        const link = this.graph.getLink(prevNode.id, node.id)
        if (link && link.data !== undefined) {
          path.push(link.data as number) // fee
        }
      }
      path.push(node.id as Address)
    })

    return path
  }
}

// 将路径编码为 bytes
export function encodePath(path: PathElement[]): `0x${string}` {
  if (path.length === 0) return '0x'

  // 路径格式: token0, fee1, token1, fee2, token2, ...
  // 每 3 个元素一组: address (20 bytes) + fee (3 bytes)
  const types: string[] = ['address']
  const values: (Address | bigint)[] = [path[0] as Address]

  for (let i = 1; i < path.length; i += 2) {
    types.push('uint24', 'address')
    values.push(BigInt(path[i] as number), path[i + 1] as Address)
  }

  return encodeAbiParameters(
    parseAbiParameters(types.join(', ')),
    values
  )
}