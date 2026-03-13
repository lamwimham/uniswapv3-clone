import { createPublicClient, createWalletClient, http, parseAbi, parseEther, formatEther } from 'viem'
import { anvil } from 'viem/chains'
import { mnemonicToAccount } from 'viem/accounts'

// 使用 Anvil 预设的账户
const account = mnemonicToAccount("test test test test test test test test test test test junk", { index: 0 })

// 创建客户端
const publicClient = createPublicClient({
  chain: anvil,
  transport: http('http://localhost:8545'),
})

const walletClient = createWalletClient({
  chain: anvil,
  transport: http('http://localhost:8545'),
  account,
})

async function testAddLiquidity() {
  // 合约地址
  const managerAddress = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9' as `0x${string}`
  const wethAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`
  const usdcAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as `0x${string}`
  const poolAddress = '0x75537828f2ce51be7289709686a69cbfdbb714f1' as `0x${string}`

  // ABI
  const erc20Abi = parseAbi([
    "function approve(address spender, uint256 amount) returns (bool)",
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)"
  ])
  
  const managerAbi = parseAbi([
    "function mint(address poolAddress_, int24 lowerTick_, int24 upperTick_, uint128 liquidity_, bytes data) external"
  ])

  console.log('开始测试添加流动性...')
  
  try {
    // 1. 检查账户余额
    console.log('\n1. 检查账户余额')
    const ethBalance = await publicClient.getBalance({ address: account.address })
    console.log(`ETH 余额: ${ethBalance}`)
    
    const wethBalance = await publicClient.readContract({
      address: wethAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address],
    })
    console.log(`WETH 余额: ${wethBalance}`)
    
    const usdcBalance = await publicClient.readContract({
      address: usdcAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address],
    })
    console.log(`USDC 余额: ${usdcBalance}`)

    // 2. 授权代币给 Manager 合约
    console.log('\n2. 授权代币给 Manager 合约')
    
    // 授权 WETH
    const approveWethTx = await walletClient.writeContract({
      address: wethAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [managerAddress, 1000000000000000000n], // 1 WETH
    })
    console.log(`WETH 授权交易哈希: ${approveWethTx}`)
    
    // 授权 USDC
    const approveUsdcTx = await walletClient.writeContract({
      address: usdcAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [managerAddress, 5000000000000n], // 5000 USDC
    })
    console.log(`USDC 授权交易哈希: ${approveUsdcTx}`)

    // 3. 添加流动性
    console.log('\n3. 添加流动性')
    
    // 构建回调数据
    const data = `0x${wethAddress.slice(2)}${usdcAddress.slice(2)}` as `0x${string}`
    
    const mintTx = await walletClient.writeContract({
      address: managerAddress,
      abi: managerAbi,
      functionName: 'mint',
      args: [
        poolAddress,
        84222, // lowerTick
        86129, // upperTick
        1000000n, // liquidity
        data
      ],
    })
    
    console.log(`添加流动性交易哈希: ${mintTx}`)
    
    // 4. 等待交易确认
    console.log('\n4. 等待交易确认...')
    const receipt = await publicClient.waitForTransactionReceipt({ hash: mintTx })
    console.log(`交易状态: ${receipt.status}`)
    
    // 5. 检查池子状态
    console.log('\n5. 检查池子状态')
    try {
      const liquidity = await publicClient.readContract({
        address: poolAddress,
        abi: poolAbi, // 需要定义 poolAbi
        functionName: 'liquidity',
      })
      console.log(`池子流动性: ${liquidity}`)
    } catch (err) {
      console.log(`无法读取池子流动性: ${(err as Error).message}`)
    }
    
    try {
      const slot0 = await publicClient.readContract({
        address: poolAddress,
        abi: poolAbi, // 需要定义 poolAbi
        functionName: 'slot0',
      })
      console.log(`池子状态 (sqrtPriceX96, tick):`, slot0)
    } catch (err) {
      console.log(`无法读取池子状态: ${(err as Error).message}`)
    }
    
  } catch (error) {
    console.error('测试失败:', error)
  }
}

testAddLiquidity()