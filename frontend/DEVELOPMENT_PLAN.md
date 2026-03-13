# Uniswap V3 前端开发计划 - wagmi + viem 技术栈

## 项目概述

使用 **wagmi + viem** 现代技术栈构建 Uniswap V3 DEX 前端。
- **功能逻辑**: 100% 借鉴参考项目 `/Users/lianwenhua/indie/web3/uniswap/uniswapv3-code/ui`
- **技术栈**: 完全使用 wagmi + viem，不使用参考项目的 ethers.js

---

## 一、参考项目功能分析

### 1.1 核心模块

| 模块 | 参考文件 | 核心功能 |
|------|---------|---------|
| 钱包连接 | `contexts/MetaMask.js`, `components/MetaMask.js` | 连接、状态、链信息显示 |
| Swap | `components/SwapForm.js` | 代币选择、路径查找、价格查询、滑点、approve + swap |
| 添加流动性 | `components/AddLiquidityForm.js` | 价格范围、tick计算、approve + mint |
| 移除流动性 | `components/RemoveLiquidityForm.js` | 查询头寸、burn + collect |
| 事件监听 | `components/EventsFeed.js` | Mint/Swap/Burn/Collect 事件实时显示 |

### 1.2 工具函数

| 文件 | 功能 |
|------|------|
| `lib/pathFinder.js` | 图算法查找最优交易路径 (ngraph) |
| `lib/computePoolAddress.js` | CREATE2 计算池地址 |
| `lib/constants.js` | 常量定义 |
| `lib/debounce.js` | 防抖函数 |

### 1.3 合约交互

| 合约 | 方法 | 用途 |
|------|------|------|
| **Factory** | `queryFilter("PoolCreated")` | 加载所有交易对 |
| **Manager** | `swap(params)` | 多跳交换 |
| **Manager** | `mint(params)` | 添加流动性 |
| **Manager** | `getPosition(params)` | 查询头寸 |
| **Quoter** | `quote(path, amountIn)` | 价格报价 |
| **Pool** | `burn()`, `collect()` | 移除流动性 |
| **Pool** | 事件监听 | Mint, Swap, Burn, Collect |
| **ERC20** | `approve()`, `allowance()` | 代币授权 |

---

## 二、技术栈对比

| 方面 | 参考项目 (ethers.js) | 新项目 (wagmi + viem) |
|------|---------------------|----------------------|
| 框架 | Create React App | Next.js 14 (App Router) |
| 语言 | JavaScript | TypeScript |
| 区块链 | ethers.js 5.x | viem 2.x |
| React集成 | 手动 Context | wagmi Hooks |
| 合约调用 | `contract.method()` | `useReadContract`, `useWriteContract` |
| 事件监听 | `contract.on()` | `useWatchContractEvent` |
| 地址类型 | string | Address (类型安全) |
| BigNumber | ethers.BigNumber | bigint (原生) |

---

## 三、项目结构

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # 全局布局 + Providers
│   │   ├── page.tsx            # 首页 (Swap)
│   │   ├── pool/page.tsx       # 流动性管理
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── wallet/
│   │   │   ├── ConnectButton.tsx    # 钱包连接按钮
│   │   │   └── AccountInfo.tsx      # 账户信息显示
│   │   ├── swap/
│   │   │   ├── SwapForm.tsx         # Swap 主表单
│   │   │   ├── TokenInput.tsx       # 代币输入组件
│   │   │   ├── TokenSelect.tsx      # 代币选择器
│   │   │   └── SlippageControl.tsx  # 滑点设置
│   │   ├── liquidity/
│   │   │   ├── AddLiquidityForm.tsx # 添加流动性
│   │   │   ├── RemoveLiquidityForm.tsx # 移除流动性
│   │   │   └── PriceRange.tsx       # 价格范围输入
│   │   └── events/
│   │       └── EventsFeed.tsx       # 事件流显示
│   │
│   ├── hooks/                  # 自定义 Hooks (借鉴参考项目逻辑)
│   │   ├── usePairs.ts         # 加载交易对列表
│   │   ├── useSwap.ts          # Swap 逻辑
│   │   ├── useLiquidity.ts     # 流动性操作
│   │   ├── useTokenApproval.ts # 代币授权
│   │   ├── useQuote.ts         # 价格查询
│   │   └── usePoolEvents.ts    # 事件监听
│   │
│   ├── lib/
│   │   ├── wagmi.ts            # wagmi 配置
│   │   ├── chains.ts           # 链配置
│   │   ├── pathFinder.ts       # 路径查找算法 (借鉴参考项目)
│   │   ├── computePoolAddress.ts # 池地址计算 (借鉴参考项目)
│   │   ├── tickMath.ts         # Tick 数学计算
│   │   └── constants.ts        # 常量
│   │
│   ├── contracts/
│   │   ├── addresses.ts        # 合约地址配置
│   │   └── abis/               # ABI 文件 (从参考项目复制)
│   │       ├── manager.ts
│   │       ├── pool.ts
│   │       ├── factory.ts
│   │       ├── quoter.ts
│   │       └── erc20.ts
│   │
│   └── types/
│       └── index.ts            # 类型定义
│
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 四、开发阶段详解

### 阶段 1: 项目初始化 (Day 1)

#### 1.1 创建 Next.js 项目
```bash
cd /Users/lianwenhua/indie/web3/uniswap/uniswap-v3-clone/frontend
npx create-next-app@latest . --typescript --tailwind --app --src-dir
```

#### 1.2 安装依赖
```bash
# 核心依赖
npm install viem wagmi @tanstack/react-query

# Uniswap SDK (tick 计算，参考项目使用)
npm install @uniswap/v3-sdk

# 路径查找 (借鉴参考项目)
npm install ngraph.graph ngraph.path

# 工具库
npm install zustand
```

#### 1.3 配置 wagmi + viem

```typescript
// src/lib/wagmi.ts
import { http, createConfig } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

// 本地开发链 (Anvil)
export const localhost = {
  id: 31337,
  name: 'Localhost',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['http://localhost:8545'] } },
} as const

export const config = createConfig({
  chains: [localhost, sepolia, mainnet],
  connectors: [injected(), metaMask()],
  transports: {
    [localhost.id]: http('http://localhost:8545'),
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
```

#### 1.4 从参考项目复制 ABI
```bash
# 复制 ABI 文件到新项目
cp /Users/lianwenhua/indie/web3/uniswap/uniswapv3-code/ui/src/abi/*.json ./src/contracts/abis/
```

---

### 阶段 2: 钱包连接模块 (Day 2)

**借鉴**: `contexts/MetaMask.js` + `components/MetaMask.js`

#### wagmi 实现对比

| ethers.js (参考项目) | wagmi (新项目) |
|---------------------|----------------|
| `window.ethereum.request({ method: 'eth_requestAccounts' })` | `useConnect()` hook |
| 手动管理 status/account/chain 状态 | `useAccount()` 自动管理 |
| Context Provider | `WagmiProvider` 自动提供 |

#### 核心代码

```typescript
// src/components/wallet/ConnectButton.tsx
'use client'

import { useAccount, useConnect, useDisconnect, useBalance, useChainId } from 'wagmi'

export function ConnectButton() {
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: balance } = useBalance({ address })
  const chainId = useChainId()

  const chainNames: Record<number, string> = {
    31337: 'Anvil',
    1: 'Mainnet',
    11155111: 'Sepolia',
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        <span>{chainNames[chainId] || 'Unknown'}</span>
        <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
        <span>{balance?.formatted} ETH</span>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    )
  }

  return (
    <div>
      {connectors.map((connector) => (
        <button key={connector.id} onClick={() => connect({ connector })}>
          Connect {connector.name}
        </button>
      ))}
    </div>
  )
}
```

---

### 阶段 3: Swap 功能模块 (Day 3-4)

**借鉴**: `components/SwapForm.js`

#### 3.1 加载交易对 (usePairs Hook)

```typescript
// src/hooks/usePairs.ts
// 借鉴 SwapForm.js 中的 loadPairs 函数

import { useReadContracts } from 'wagmi'
import { factoryAbi } from '@/contracts/abis/factory'

export function usePairs(factoryAddress: Address) {
  // 参考项目: factory.queryFilter("PoolCreated", "earliest", "latest")
  // wagmi 方式: 使用 useContractEvent 或公共客户端

  const { data: logs } = useContractEvent({
    address: factoryAddress,
    abi: factoryAbi,
    eventName: 'PoolCreated',
    fromBlock: 'earliest',
    toBlock: 'latest',
  })

  return logs?.map((log) => ({
    token0: { address: log.args.token0, symbol: getTokenSymbol(log.args.token0) },
    token1: { address: log.args.token1, symbol: getTokenSymbol(log.args.token1) },
    fee: log.args.fee,
    address: log.args.pool,
  }))
}
```

#### 3.2 路径查找 (PathFinder)

```typescript
// src/lib/pathFinder.ts
// 完全借鉴参考项目的 pathFinder.js

import createGraph from 'ngraph.graph'
import path from 'ngraph.path'

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

  findPath(fromToken: Address, toToken: Address): Path {
    return this.finder.find(fromToken, toToken).reduce((acc, node, i, orig) => {
      if (acc.length > 0) {
        acc.push(this.graph.getLink(orig[i - 1].id, node.id).data)
      }
      acc.push(node.id)
      return acc
    }, []).reverse()
  }
}
```

#### 3.3 价格查询 (useQuote Hook)

```typescript
// src/hooks/useQuote.ts
// 借鉴 SwapForm.js 中的 updateAmountOut 函数

import { useContractRead } from 'wagmi'
import { quoterAbi } from '@/contracts/abis/quoter'
import { encodeAbiParameters, parseAbiParameters } from 'viem'

export function useQuote(quoterAddress: Address, path: Path, amountIn: bigint) {
  // 参考项目: quoter.callStatic.quote(packedPath, amountIn)
  // viem 方式:

  const packedPath = encodePath(path) // 类似 ethers.utils.solidityPack

  const { data, isLoading } = useReadContract({
    address: quoterAddress,
    abi: quoterAbi,
    functionName: 'quote',
    args: [packedPath, amountIn],
    query: {
      enabled: amountIn > 0n,
    },
  })

  return {
    amountOut: data?.[0], // amountOut
    sqrtPriceX96AfterList: data?.[1],
    tickAfterList: data?.[2],
    isLoading,
  }
}
```

#### 3.4 Swap 执行 (useSwap Hook)

```typescript
// src/hooks/useSwap.ts
// 借鉴 SwapForm.js 中的 swap 函数

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { managerAbi } from '@/contracts/abis/manager'

export function useSwap() {
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  const swap = (params: {
    managerAddress: Address
    path: Path
    recipient: Address
    amountIn: bigint
    minAmountOut: bigint
  }) => {
    // 参考项目: manager.swap(params)
    writeContract({
      address: params.managerAddress,
      abi: managerAbi,
      functionName: 'swap',
      args: [{
        path: encodePath(params.path),
        recipient: params.recipient,
        amountIn: params.amountIn,
        minAmountOut: params.minAmountOut,
      }],
    })
  }

  return { swap, isPending, isSuccess, hash }
}
```

#### 3.5 代币授权 (useTokenApproval Hook)

```typescript
// src/hooks/useTokenApproval.ts
// 借鉴 SwapForm.js 和 AddLiquidityForm.js 中的 approve 逻辑

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { erc20Abi } from 'viem'
import { maxUint256 } from 'viem'

export function useTokenApproval(
  tokenAddress: Address,
  spender: Address,
  amount: bigint
) {
  // 查询授权额度
  const { data: allowance } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [useAccount().address, spender],
  })

  // 是否需要授权
  const needsApproval = allowance ? allowance < amount : true

  // 授权
  const { writeContract, data: hash } = useWriteContract()

  const approve = () => {
    writeContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, maxUint256],
    })
  }

  const { isSuccess: isApproved } = useWaitForTransactionReceipt({ hash })

  return { needsApproval, approve, isApproved }
}
```

---

### 阶段 4: 流动性管理模块 (Day 5-6)

**借鉴**: `AddLiquidityForm.js` + `RemoveLiquidityForm.js`

#### 4.1 Tick 数学计算

```typescript
// src/lib/tickMath.ts
// 参考项目使用 @uniswap/v3-sdk 的 TickMath 和 encodeSqrtRatioX96

import { TickMath, encodeSqrtRatioX96, nearestUsableTick } from '@uniswap/v3-sdk'
import { Fraction } from '@uniswap/sdk-core'

// 价格转 sqrtPriceX96
export function priceToSqrtPriceX96(price: number): bigint {
  // 参考项目: encodeSqrtRatioX96(price, 1)
  const sqrtRatio = encodeSqrtRatioX96(price, 1)
  return BigInt(sqrtRatio.toString())
}

// 价格转 tick
export function priceToTick(price: number): number {
  const sqrtPriceX96 = priceToSqrtPriceX96(price)
  return TickMath.getTickAtSqrtRatio(sqrtPriceX96)
}

// 获取最近可用 tick
export function getNearestUsableTick(tick: number, feeSpacing: number): number {
  return nearestUsableTick(tick, feeSpacing)
}
```

#### 4.2 添加流动性 (useAddLiquidity Hook)

```typescript
// src/hooks/useLiquidity.ts
// 借鉴 AddLiquidityForm.js 中的 addLiquidity 函数

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { managerAbi } from '@/contracts/abis/manager'

export function useAddLiquidity() {
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  const addLiquidity = (params: {
    managerAddress: Address
    tokenA: Address
    tokenB: Address
    fee: number
    lowerTick: number
    upperTick: number
    amount0Desired: bigint
    amount1Desired: bigint
    amount0Min: bigint
    amount1Min: bigint
  }) => {
    // 参考项目: manager.mint(mintParams)
    writeContract({
      address: params.managerAddress,
      abi: managerAbi,
      functionName: 'mint',
      args: [{
        tokenA: params.tokenA,
        tokenB: params.tokenB,
        fee: params.fee,
        lowerTick: params.lowerTick,
        upperTick: params.upperTick,
        amount0Desired: params.amount0Desired,
        amount1Desired: params.amount1Desired,
        amount0Min: params.amount0Min,
        amount1Min: params.amount1Min,
      }],
    })
  }

  return { addLiquidity, isPending, isSuccess, hash }
}
```

#### 4.3 移除流动性 (useRemoveLiquidity Hook)

```typescript
// src/hooks/useLiquidity.ts (续)
// 借鉴 RemoveLiquidityForm.js 中的 removeLiquidity 函数

import { useWriteContract, useReadContract } from 'wagmi'
import { poolAbi } from '@/contracts/abis/pool'

export function useRemoveLiquidity(poolAddress: Address) {
  const { writeContractAsync } = useWriteContract()

  // 查询头寸
  const getPosition = (owner: Address, lowerTick: number, upperTick: number) => {
    const positionKey = getPositionKey(owner, lowerTick, upperTick)
    return useReadContract({
      address: poolAddress,
      abi: poolAbi,
      functionName: 'positions',
      args: [positionKey],
    })
  }

  // 移除流动性 (burn + collect)
  const removeLiquidity = async (params: {
    lowerTick: number
    upperTick: number
    amount: bigint
    recipient: Address
  }) => {
    // 参考项目: pool.burn() -> pool.collect()

    // 1. burn
    const burnTx = await writeContractAsync({
      address: poolAddress,
      abi: poolAbi,
      functionName: 'burn',
      args: [params.lowerTick, params.upperTick, params.amount],
    })

    // 2. collect
    await writeContractAsync({
      address: poolAddress,
      abi: poolAbi,
      functionName: 'collect',
      args: [
        params.recipient,
        params.lowerTick,
        params.upperTick,
        maxUint128, // amount0Requested
        maxUint128, // amount1Requested
      ],
    })
  }

  return { getPosition, removeLiquidity }
}
```

---

### 阶段 5: 事件监听模块 (Day 7)

**借鉴**: `components/EventsFeed.js`

#### wagmi 实现对比

| ethers.js (参考项目) | wagmi (新项目) |
|---------------------|----------------|
| `pool.queryFilter("Mint")` | `useContractEvents` 或 `client.getLogs` |
| `pool.on("Mint", callback)` | `useWatchContractEvent` |

```typescript
// src/hooks/usePoolEvents.ts
// 借鉴 EventsFeed.js 中的事件监听逻辑

import { useWatchContractEvent, usePublicClient } from 'wagmi'
import { poolAbi } from '@/contracts/abis/pool'

export function usePoolEvents(poolAddress: Address) {
  const [events, setEvents] = useState<Event[]>([])
  const publicClient = usePublicClient()

  // 历史事件 (参考项目: pool.queryFilter)
  useEffect(() => {
    const fetchHistoricalEvents = async () => {
      const logs = await publicClient.getLogs({
        address: poolAddress,
        event: getAbiItem({ abi: poolAbi, name: 'Swap' }),
        fromBlock: 'earliest',
        toBlock: 'latest',
      })
      // 处理 logs...
    }
    fetchHistoricalEvents()
  }, [poolAddress])

  // 实时监听 (参考项目: pool.on)
  useWatchContractEvent({
    address: poolAddress,
    abi: poolAbi,
    eventName: 'Swap',
    onLogs(logs) {
      setEvents(prev => [...prev, ...formatEvents(logs)])
    },
  })

  useWatchContractEvent({
    address: poolAddress,
    abi: poolAbi,
    eventName: 'Mint',
    onLogs(logs) {
      setEvents(prev => [...prev, ...formatEvents(logs)])
    },
  })

  // ... Burn, Collect

  return { events }
}
```

---

### 阶段 6: UI 组件实现 (Day 8-9)

**使用 shadcn/ui，不参考原项目样式**

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input dialog select tabs
```

#### 关键组件

| 组件 | 功能 | 借鉴逻辑 |
|------|------|---------|
| `SwapForm` | Swap 表单 | `SwapForm.js` 的表单逻辑 |
| `TokenInput` | 代币输入 | `SwapInput` 组件 |
| `TokenSelect` | 代币选择 | `selectToken` 函数 |
| `SlippageControl` | 滑点设置 | `SlippageControl` 组件 |
| `PriceRange` | 价格范围 | `PriceRange` 组件 |
| `EventsFeed` | 事件流 | `EventsFeed.js` |

---

### 阶段 7: 测试与部署 (Day 10)

#### 7.1 本地测试

```bash
# 终端 1: 启动 Anvil
anvil --chain-id 31337

# 终端 2: 部署合约
cd /Users/lianwenhua/indie/web3/uniswap/uniswap-v3-clone
forge script script/DeployDevelopment.s.sol --broadcast --rpc-url http://localhost:8545

# 终端 3: 启动前端
cd frontend
npm run dev
```

#### 7.2 更新合约地址

```typescript
// src/contracts/addresses.ts
import { Address } from 'viem'

export const CONTRACTS = {
  31337: {
    WETH: '0x...' as Address,   // 从部署日志获取
    USDC: '0x...' as Address,
    Factory: '0x...' as Address,
    Manager: '0x...' as Address,
    Quoter: '0x...' as Address,
  },
}
```

---

## 五、关键代码映射表

### 5.1 ethers.js → viem 语法映射

| ethers.js | viem |
|-----------|------|
| `ethers.utils.parseEther("1")` | `parseEther("1")` |
| `ethers.utils.formatEther(wei)` | `formatEther(wei)` |
| `ethers.utils.parseUnits("1", 18)` | `parseUnits("1", 18)` |
| `ethers.constants.MaxUint256` | `maxUint256` |
| `ethers.utils.solidityPack(types, values)` | `encodeAbiParameters(parseAbiParameters(...), values)` |
| `ethers.utils.getCreate2Address()` | `getCreate2Address()` from viem |
| `contract.connect(signer)` | `useWriteContract()` |
| `contract.callStatic.method()` | `useReadContract({ ... })` |

### 5.2 合约调用映射

| ethers.js | wagmi |
|-----------|-------|
| `new ethers.Contract(address, abi, provider)` | `useReadContract()` |
| `new ethers.Contract(address, abi, signer)` | `useWriteContract()` |
| `contract.method()` | `writeContract({ functionName: 'method' })` |
| `contract.callStatic.method()` | `useReadContract()` |
| `contract.queryFilter('Event')` | `publicClient.getLogs()` |
| `contract.on('Event', cb)` | `useWatchContractEvent()` |

---

## 六、注意事项

### 6.1 与当前合约的差异

当前合约 (`UniswapV3Pool.sol`, `UniswapV3Manager.sol`) 是简化版本，与参考项目的合约有差异：

| 差异点 | 当前合约 | 参考项目合约 |
|--------|---------|-------------|
| Manager.swap | `(poolAddress, data)` | `(SwapParams)` 结构体 |
| Manager.mint | `(pool, lowerTick, upperTick, liquidity, data)` | `(MintParams)` 结构体 |
| Quoter | 无 | 有完整 Quoter 合约 |
| Factory | 无 | 有 Factory + PoolCreated 事件 |

**解决方案**:
1. 使用参考项目的 ABI (因为参考项目合约更完整)
2. 或者修改当前合约以匹配参考项目

### 6.2 推荐方案

**建议使用参考项目的合约**，因为：
1. 功能完整 (Factory, Quoter, 完整的 Manager)
2. 前端代码可以直接借鉴
3. 测试更完善

---

## 七、开发时间表

| 阶段 | 内容 | 预计时间 |
|------|------|----------|
| Day 1 | 项目初始化、依赖安装、wagmi 配置 | 1天 |
| Day 2 | 钱包连接模块 | 1天 |
| Day 3 | Swap - usePairs, useQuote, PathFinder | 1天 |
| Day 4 | Swap - useSwap, useTokenApproval, UI | 1天 |
| Day 5 | 添加流动性 - useAddLiquidity | 1天 |
| Day 6 | 移除流动性 - useRemoveLiquidity | 1天 |
| Day 7 | 事件监听 - usePoolEvents | 1天 |
| Day 8 | UI 组件实现 (Swap) | 1天 |
| Day 9 | UI 组件实现 (Liquidity, Events) | 1天 |
| Day 10 | 测试、调试、部署 | 1天 |

---

## 八、下一步

是否开始执行 **阶段 1: 项目初始化**？

我会：
1. 创建 Next.js + TypeScript 项目
2. 安装 wagmi + viem + 其他依赖
3. 配置 wagmi Provider
4. 从参考项目复制 ABI 文件
5. 设置合约地址配置