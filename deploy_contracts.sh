#!/bin/bash

# 部署 Uniswap V3 合约的脚本

echo "开始部署 Uniswap V3 合约..."

# 检查 anvil 是否正在运行
if ! pgrep -f "anvil.*--port 8545" > /dev/null; then
    echo "启动 Anvil 节点..."
    anvil --port 8545 > /dev/null 2>&1 &
    ANVIL_PID=$!
    echo "Anvil 节点已启动，PID: $ANVIL_PID"
    
    # 等待节点启动
    sleep 3
fi

# 部署合约
echo "部署合约..."
cd /Users/lianwenhua/indie/web3/uniswap/uniswap-v3-clone
OUTPUT=$(forge script script/DeployDevelopment.s.sol --rpc-url http://localhost:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 2>&1)

if [ $? -eq 0 ]; then
    echo "合约部署成功！"
    echo "$OUTPUT"
    
    # 提取合约地址并更新前端配置
    WETH_ADDR=$(echo "$OUTPUT" | grep -oE "WETH address 0x[a-fA-F0-9]{40}" | cut -d' ' -f3)
    USDC_ADDR=$(echo "$OUTPUT" | grep -oE "USDC address 0x[a-fA-F0-9]{40}" | cut -d' ' -f3)
    FACTORY_ADDR=$(echo "$OUTPUT" | grep -oE "Factory address 0x[a-fA-F0-9]{40}" | cut -d' ' -f3)
    MANAGER_ADDR=$(echo "$OUTPUT" | grep -oE "Manager address 0x[a-fA-F0-9]{40}" | cut -d' ' -f3)
    
    if [ -n "$WETH_ADDR" ] && [ -n "$USDC_ADDR" ] && [ -n "$FACTORY_ADDR" ] && [ -n "$MANAGER_ADDR" ]; then
        echo "更新前端合约地址配置..."
        
        # 更新前端的合约地址配置
        sed -i.bak "s/WETH: '0x[a-fA-F0-9]\{40\}' as Address,/WETH: '$WETH_ADDR' as Address,/" /Users/lianwenhua/indie/web3/uniswap/uniswap-v3-clone/frontend/src/contracts/addresses.ts
        sed -i.bak "s/USDC: '0x[a-fA-F0-9]\{40\}' as Address,/USDC: '$USDC_ADDR' as Address,/" /Users/lianwenhua/indie/web3/uniswap/uniswap-v3-clone/frontend/src/contracts/addresses.ts
        sed -i.bak "s/Factory: '0x[a-fA-F0-9]\{40\}' as Address,/Factory: '$FACTORY_ADDR' as Address,/" /Users/lianwenhua/indie/web3/uniswap/uniswap-v3-clone/frontend/src/contracts/addresses.ts
        sed -i.bak "s/Manager: '0x[a-fA-F0-9]\{40\}' as Address,/Manager: '$MANAGER_ADDR' as Address,/" /Users/lianwenhua/indie/web3/uniswap/uniswap-v3-clone/frontend/src/contracts/addresses.ts
        
        echo "前端合约地址已更新:"
        echo "  WETH: $WETH_ADDR"
        echo "  USDC: $USDC_ADDR"
        echo "  Factory: $FACTORY_ADDR"
        echo "  Manager: $MANAGER_ADDR"
    fi
else
    echo "合约部署失败:"
    echo "$OUTPUT"
fi

echo "部署脚本执行完成。"