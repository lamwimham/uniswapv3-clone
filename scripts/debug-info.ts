import { createPublicClient, http, parseAbi, formatEther } from 'viem'
import { anvil } from 'viem/chains'
import { Address } from 'viem'

// 使用实际部署的合约地址
const CONTRACTS = {
  31337: {
    WETH: '0x5fbdb2315678afecb367f032d93f642f64180aa3' as Address,
    USDC: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512' as Address,
    Factory: '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0' as Address,
    Manager: '0xdc64a140aa3e981100a9beca4e685f962f0cf6c9' as Address,
  }
}

const chainId = 31337 // Anvil 本地链
const WETH_ADDRESS = CONTRACTS[chainId].WETH
const USDC_ADDRESS = CONTRACTS[chainId].USDC
const FACTORY_ADDRESS = CONTRACTS[chainId].Factory
const MANAGER_ADDRESS = CONTRACTS[chainId].Manager

// 已创建的池子地址
const POOL_ADDRESS = '0x75537828f2ce51be7289709686a69cbfdbb714f1' as Address

// ERC20 ABI
const erc20Abi = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)"
])

// Factory ABI
const factoryAbi = parseAbi([
  "event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, address pool)",
  "function getPool(address tokenA, address tokenB, uint24 fee) view returns (address)"
])

// Pool ABI
const poolAbi = parseAbi([
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function liquidity() view returns (uint128)",
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint160 observationIndex, uint160 observationCardinality, uint160 observationCardinalityNext, bool unlocked)"
])

async function debugInfo() {
  // 创建公共客户端连接到本地节点
  const publicClient = createPublicClient({
    chain: anvil,
    transport: http('http://127.0.0.1:8545'), // 默认 Anvil 端口
  })

  try {
    console.log("=== Uniswap V3 调试信息 ===\n")

    // 获取最新区块号
    const blockNumber = await publicClient.getBlockNumber()
    console.log(`当前区块高度: ${blockNumber}\n`)

    // 检查默认账户余额 (Anvil 预设账户)
    const defaultAccount = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as Address
    
    console.log("=== 账户信息 ===")
    console.log(`账户地址: ${defaultAccount}`)
    
    // 检查 ETH 余额
    const ethBalance = await publicClient.getBalance({ address: defaultAccount })
    console.log(`ETH 余额: ${formatEther(ethBalance)} ETH\n`)
    
    // 检查 WETH 余额
    try {
      const wethBalance = await publicClient.readContract({
        address: WETH_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [defaultAccount],
      })
      console.log(`WETH 余额: ${formatEther(wethBalance)} WETH`)
      
      // 获取 WETH 代币信息
      const wethSymbol = await publicClient.readContract({
        address: WETH_ADDRESS,
        abi: erc20Abi,
        functionName: 'symbol',
      })
      console.log(`WETH 符号: ${wethSymbol}`)
      
      const wethName = await publicClient.readContract({
        address: WETH_ADDRESS,
        abi: erc20Abi,
        functionName: 'name',
      })
      console.log(`WETH 名称: ${wethName}`)
      
      const wethDecimals = await publicClient.readContract({
        address: WETH_ADDRESS,
        abi: erc20Abi,
        functionName: 'decimals',
      })
      console.log(`WETH 精度: ${wethDecimals}\n`)
    } catch (err) {
      console.log(`WETH 信息: 无法读取 - ${(err as Error).message}\n`)
    }
    
    // 检查 USDC 余额
    try {
      const usdcBalance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [defaultAccount],
      })
      console.log(`USDC 余额: ${formatEther(usdcBalance)} USDC`)
      
      // 获取 USDC 代币信息
      const usdcSymbol = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'symbol',
      })
      console.log(`USDC 符号: ${usdcSymbol}`)
      
      const usdcName = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'name',
      })
      console.log(`USDC 名称: ${usdcName}`)
      
      const usdcDecimals = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'decimals',
      })
      console.log(`USDC 精度: ${usdcDecimals}\n`)
    } catch (err) {
      console.log(`USDC 信息: 无法读取 - ${(err as Error).message}\n`)
    }

    // 检查 Factory 合约
    console.log("=== Factory 合约信息 ===")
    console.log(`Factory 地址: ${FACTORY_ADDRESS}`)
    
    // 获取 PoolCreated 事件
    const poolCreatedLogs = await publicClient.getLogs({
      address: FACTORY_ADDRESS,
      event: {
        type: 'event',
        name: 'PoolCreated',
        inputs: [
          { indexed: true, name: 'token0', type: 'address' },
          { indexed: true, name: 'token1', type: 'address' },
          { indexed: true, name: 'fee', type: 'uint24' },
          { indexed: false, name: 'pool', type: 'address' },
        ],
      },
      fromBlock: 0n,
      toBlock: 'latest',
    })
    
    console.log(`已创建池子数量: ${poolCreatedLogs.length}`)
    
    if (poolCreatedLogs.length > 0) {
      console.log("\n已创建的池子详情:")
      for (let i = 0; i < poolCreatedLogs.length; i++) {
        const log = poolCreatedLogs[i]
        if ('args' in log && log.args) {
          console.log(`  池子 ${i+1}:`)
          console.log(`    Token0: ${log.args.token0}`)
          console.log(`    Token1: ${log.args.token1}`)
          console.log(`    Fee: ${log.args.fee}`)
          console.log(`    Pool 地址: ${log.args.pool}`)
          
          // 检查池子状态
          try {
            const poolLiquidity = await publicClient.readContract({
              address: log.args.pool as Address,
              abi: poolAbi,
              functionName: 'liquidity',
            })
            console.log(`    流动性: ${poolLiquidity}`)
            
            const slot0 = await publicClient.readContract({
              address: log.args.pool as Address,
              abi: poolAbi,
              functionName: 'slot0',
            })
            console.log(`    当前价格: ${slot0[0]} (sqrtPriceX96), Tick: ${slot0[1]}`)
          } catch (err) {
            console.log(`    无法读取池子状态: ${(err as Error).message}`)
          }
          console.log("")
        }
      }
    } else {
      console.log("没有创建任何池子")
    }

    // 检查特定池子
    console.log("=== 特定池子信息 ===")
    console.log(`池子地址: ${POOL_ADDRESS}`)
    try {
      const token0 = await publicClient.readContract({
        address: POOL_ADDRESS,
        abi: poolAbi,
        functionName: 'token0',
      })
      console.log(`Token0: ${token0}`)
      
      const token1 = await publicClient.readContract({
        address: POOL_ADDRESS,
        abi: poolAbi,
        functionName: 'token1',
      })
      console.log(`Token1: ${token1}`)
      
      const liquidity = await publicClient.readContract({
        address: POOL_ADDRESS,
        abi: poolAbi,
        functionName: 'liquidity',
      })
      console.log(`流动性: ${liquidity}`)
    } catch (err) {
      console.log(`无法读取池子信息: ${(err as Error).message}`)
    }

    // 检查 Manager 合约
    console.log("\n=== Manager 合约信息 ===")
    console.log(`Manager 地址: ${MANAGER_ADDRESS}`)

    console.log("\n=== 合约地址汇总 ===")
    console.log(`WETH: ${WETH_ADDRESS}`)
    console.log(`USDC: ${USDC_ADDRESS}`)
    console.log(`Factory: ${FACTORY_ADDRESS}`)
    console.log(`Manager: ${MANAGER_ADDRESS}`)
    console.log(`Pool: ${POOL_ADDRESS}`)

    console.log("\n=== 前端问题排查建议 ===")
    console.log("1. 检查前端的 usePairs hook 是否能正确获取 PoolCreated 事件")
    console.log("2. 确认前端组件是否能正确显示已获取的池子信息")
    console.log("3. 检查前端钱包连接状态和账户权限")
    console.log("4. 确认前端合约地址配置是否与实际部署地址一致")
    console.log("5. 检查前端是否有足够的代币余额来添加流动性")

  } catch (error) {
    console.error("调试信息获取失败:", error)
  }
}

debugInfo()