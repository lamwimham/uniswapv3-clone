import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

// 本地开发链 (Anvil)
export const localhost = {
  id: 31337,
  name: 'Localhost (Anvil)',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://localhost:8545'] },
  },
} as const

// Sepolia RPC URL - 使用 Alchemy 公共 RPC 或自定义
const SEPOLIA_RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/HEJJz2H5mUF0LDkviAOGk'

export const config = createConfig({
  chains: [sepolia, localhost], // Sepolia 为默认链
  connectors: [injected(), metaMask()],
  transports: {
    [sepolia.id]: http(SEPOLIA_RPC_URL),
    [localhost.id]: http('http://localhost:8545'),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}