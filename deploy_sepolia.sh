#!/bin/bash

# Uniswap V3 Clone - Sepolia 部署脚本
# 自动部署合约并更新前端配置

set -e

echo "========================================"
echo "Uniswap V3 Clone - Sepolia Deployment"
echo "========================================"

# 检查环境变量
if [ -z "$SEPOLIA_RPC_URL" ]; then
    echo "Error: SEPOLIA_RPC_URL is not set"
    echo "Please set it in .env file or export it"
    exit 1
fi

if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY is not set"
    echo "Please set it in .env file or export it"
    exit 1
fi

# 加载 .env 文件（如果存在）
if [ -f ".env" ]; then
    echo "Loading .env file..."
    source .env
fi

# 部署合约
echo ""
echo "Deploying contracts to Sepolia..."
echo ""

forge script script/DeploySepolia.s.sol:DeploySepolia \
    --rpc-url sepolia \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify \
    -vvv

echo ""
echo "========================================"
echo "Deployment completed!"
echo "========================================"
echo ""
echo "Please check the output above for contract addresses."
echo "Update frontend/src/contracts/addresses.ts manually or run:"
echo ""
echo "  ./update_frontend_config.sh"
echo ""