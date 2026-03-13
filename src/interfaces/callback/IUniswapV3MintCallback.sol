// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface IUniswapV3MintCallback {

  /// @notice 当UniswapV3Pool.mint()被调用时，完成流动性的欠佳之后会调用此方法，将callback数据传递给调用者
  /// @param amount0Owed 添加的token0数量
  /// @param amount1Owed 添加的token1数量
  function uniswapV3MintCallback(
    uint256 amount0Owed,
    uint256 amount1Owed,
    bytes calldata data
  ) external;
}