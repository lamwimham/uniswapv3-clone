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

export const config = createConfig({
  chains: [localhost, sepolia],
  connectors: [injected(), metaMask()],
  transports: {
    [localhost.id]: http('http://localhost:8545'),
    [sepolia.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}