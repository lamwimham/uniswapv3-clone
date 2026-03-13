# Uniswap V3 Clone

一个基于 Solidity 实现的 Uniswap V3 去中心化交易所克隆项目，包含完整的智能合约和前端交互界面。

## 项目简介

本项目实现了 Uniswap V3 协议的核心功能，包括：

- **集中流动性**：流动性提供者可以在指定的价格区间内提供流动性
- **多费率层级**：支持 0.05%、0.3%、1% 三种费率层级
- **范围订单**：支持类似限价单的范围订单功能
- **高效的 Tick 机制**：使用位图索引优化 Tick 查询

## 功能特性

### 智能合约

- `UniswapV3Pool` - 核心池合约，处理流动性管理和代币交换
- `UniswapV3Factory` - 工厂合约，用于创建和管理交易池
- `UniswapV3Manager` - 管理器合约，提供用户友好的交互接口

### 前端界面

- 代币交换（Swap）
- 添加/移除流动性
- 查看池信息和个人持仓
- 钱包连接（MetaMask）
- 实时事件订阅

## 技术栈

### 智能合约

- **Solidity** ^0.8.30
- **Foundry** - 以太坊开发框架
- **OpenZeppelin** - 安全的合约库

### 前端

- **Next.js** 16 - React 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **wagmi** - React Hooks for Ethereum
- **viem** - TypeScript 以太坊接口

## 环境要求

- Node.js >= 18
- Foundry (forge, anvil, cast)
- pnpm / npm / yarn

### 安装 Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/lamwimham/uniswapv3-clone.git
cd uniswapv3-clone
```

### 2. 安装依赖

```bash
# 安装 Foundry 依赖
forge install

# 安装前端依赖
cd frontend
npm install
```

## 合约开发

### 编译合约

```bash
forge build
```

### 运行测试

```bash
# 运行所有测试
forge test

# 运行测试并显示详细输出
forge test -vvvv

# 运行特定测试
forge test --match-test testMintSuccess

# 生成测试覆盖率报告
forge coverage
```

### 测试说明

测试文件位于 `test/UniswapV3Pool.t.sol`，包含以下测试用例：

| 测试名称 | 描述 |
|---------|------|
| `testMintSuccess` | 测试成功添加流动性 |
| `testMintInvalidTickRange` | 测试无效 Tick 范围 |
| `testMintZeroLiquidity` | 测试零流动性错误 |
| `testMintInsufficientInputAmount` | 测试输入金额不足 |
| `testSwapBuyEth` | 测试购买 ETH 的交换 |
| `testSwapInsufficientInputAmount` | 测试交换时输入不足 |

### 格式化代码

```bash
forge fmt
```

### Gas 快照

```bash
forge snapshot
```

## 合约部署

### 本地开发环境部署

#### 方式一：使用部署脚本

```bash
# 赋予执行权限
chmod +x deploy_contracts.sh

# 运行部署脚本
./deploy_contracts.sh
```

该脚本会自动：
1. 启动 Anvil 本地节点
2. 部署所有合约
3. 更新前端配置中的合约地址

#### 方式二：手动部署

1. 启动 Anvil 本地节点：

```bash
anvil --port 8545
```

2. 在新终端中部署合约：

```bash
forge script script/DeployDevelopment.s.sol:DeployDevelopment \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

3. 记录部署的合约地址，更新 `frontend/src/contracts/addresses.ts`：

```typescript
export const CONTRACTS: Record<number, {...}> = {
  31337: {
    WETH: '0x...' as Address,  // 更新为实际地址
    USDC: '0x...' as Address,
    Factory: '0x...' as Address,
    Manager: '0x...' as Address,
    Quoter: '0x...' as Address,
  },
}
```

### 部署到测试网（Sepolia）

1. 配置环境变量：

```bash
export RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
export PRIVATE_KEY=your_private_key
```

2. 编写部署脚本或使用现有脚本：

```bash
forge script script/DeployDevelopment.s.sol:DeployDevelopment \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key YOUR_ETHERSCAN_API_KEY
```

## 前端开发

### 启动开发服务器

```bash
cd frontend

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### 配置钱包

1. 安装 MetaMask 浏览器扩展
2. 添加本地网络（Anvil）：

| 参数 | 值 |
|-----|-----|
| 网络名称 | Localhost (Anvil) |
| RPC URL | http://localhost:8545 |
| 链 ID | 31337 |
| 货币符号 | ETH |

3. 导入 Anvil 测试账户：

```
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### 前端功能

#### 代币交换

- 选择输入/输出代币
- 输入交换数量
- 设置滑点容忍度
- 执行交换

#### 流动性管理

- 查看池信息（当前价格、TVL）
- 添加流动性（设置价格区间）
- 查看个人持仓
- 移除流动性

### 构建生产版本

```bash
npm run build
npm start
```

### 部署到 Vercel

1. 推送代码到 GitHub
2. 在 Vercel 中导入项目
3. 设置 Root Directory 为 `frontend`
4. 部署

## 项目结构

```
.
├── src/                          # 智能合约源码
│   ├── UniswapV3Pool.sol         # 核心池合约
│   ├── UniswapV3Factory.sol      # 工厂合约
│   ├── UniswapV3Manager.sol      # 管理器合约
│   ├── interfaces/               # 接口定义
│   │   └── callback/             # 回调接口
│   └── lib/                      # 库合约
│       ├── BitMath.sol           # 位运算
│       ├── FixedPointX96.sol     # 定点数运算
│       ├── FullMath.sol          # 全精度数学
│       ├── Math.sol              # 数学工具
│       ├── Position.sol          # 持仓管理
│       ├── SwapMath.sol          # 交换计算
│       ├── Tick.sol              # Tick 管理
│       ├── TickBitmap.sol        # Tick 位图
│       └── TickMath.sol          # Tick 数学
├── test/                         # 测试文件
│   ├── ERC20Mintable.sol         # 测试用 ERC20
│   └── UniswapV3Pool.t.sol       # 池合约测试
├── script/                       # 部署脚本
│   ├── DeployDevelopment.s.sol   # 开发环境部署
│   └── MintTokens.s.sol          # 铸造测试代币
├── frontend/                     # 前端应用
│   ├── src/
│   │   ├── app/                  # Next.js 页面
│   │   ├── components/           # React 组件
│   │   │   ├── swap/             # 交换组件
│   │   │   ├── liquidity/        # 流动性组件
│   │   │   ├── wallet/           # 钱包组件
│   │   │   └── events/           # 事件组件
│   │   ├── contracts/            # 合约配置
│   │   │   ├── abis/             # ABI 文件
│   │   │   └── addresses.ts      # 合约地址
│   │   ├── hooks/                # React Hooks
│   │   └── lib/                  # 工具函数
│   ├── public/                   # 静态资源
│   └── package.json
├── lib/                          # Foundry 依赖
├── foundry.toml                  # Foundry 配置
├── remappings.txt                # 导入映射
└── deploy_contracts.sh           # 部署脚本
```

## 技术亮点

### 1. 定点数运算

采用 Q64.96 定点数格式表示 √Price，在保证精度的同时避免浮点数运算，确保合约在 EVM 上的确定性执行。

### 2. 位图索引优化

使用 TickBitmap 位图结构存储 Tick 状态，通过位运算实现高效的状态查询和更新，将空间复杂度从 O(n) 优化到 O(n/256)。

### 3. 价格区间计算

实现精确的流动性计算公式：

```
amount0 = liquidity × (√Pb - √Pa) / (√Pb × √Pa)
amount1 = liquidity × (√Pb - √Pa)
```

### 4. 安全性保障

- **输入验证**：Tick 范围检查、流动性非零检查
- **回调验证**：通过余额比对确保用户已正确转账
- **重入保护**：遵循 Checks-Effects-Interactions 模式

### 5. Gas 优化

- 使用 immutable 变量减少存储读取
- 位图索引减少遍历开销
- 紧凑的结构体布局

## API 参考

### UniswapV3Pool

```solidity
// 添加流动性
function mint(
    address owner,
    int24 lowerTick,
    int24 upperTick,
    uint128 amount,
    bytes calldata data
) external returns (uint256 amount0, uint256 amount1)

// 交换代币
function swap(
    address recipient,
    bool zeroForOne,
    uint256 amountSpecified,
    bytes calldata data
) external returns (int256 amount0Delta, int256 amount1Delta)

// 获取当前状态
function slot0() external view returns (uint160 sqrtPriceX96, int24 tick)

// 获取当前流动性
function liquidity() external view returns (uint128)
```

### UniswapV3Factory

```solidity
// 创建新池
function createPool(
    address token0,
    address token1,
    uint24 fee
) external returns (address pool)

// 获取池地址
function getPool(
    address token0,
    address token1,
    uint24 fee
) external view returns (address)
```

## 开发路线图

- [x] 核心池合约实现
- [x] 流动性管理（Mint/Burn）
- [x] 代币交换（Swap）
- [x] Tick 位图索引
- [x] 前端基础界面
- [ ] Quoter 报价合约
- [ ] Flash Swap 闪电贷
- [ ] 多跳路由
- [ ] 价格预言机
- [ ] 移动端适配

## 常见问题

### Q: 如何获取测试代币？

A: 部署脚本会自动部署 WETH 和 USDC 测试代币，并铸造给部署者。你也可以使用 `script/MintTokens.s.sol` 铸造更多代币。

### Q: 为什么交换失败？

A: 检查以下几点：
1. 是否已授权代币给 Manager 合约
2. 钱包余额是否充足
3. 池中是否有足够的流动性
4. 滑点设置是否合理

### Q: 如何在测试网上部署？

A: 参考"部署到测试网"章节，确保你有足够的测试 ETH 支付 Gas 费用。

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT License

## 致谢

- [Uniswap V3](https://github.com/Uniswap/v3-core) - 原始协议设计
- [Foundry](https://github.com/foundry-rs/foundry) - 开发框架
- [OpenZeppelin](https://github.com/OpenZeppelin/openzeppelin-contracts) - 合约库

---

**免责声明**：本项目仅供学习和研究目的，未经充分审计，请勿在生产环境中使用。