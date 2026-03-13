// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

library Tick { 
  struct Info {
    bool tickInitialized;
    uint128 tickLiquidity;
  }

  function update(
    mapping(int24 => Tick.Info) storage self,
    int24 tick,
    uint128 liquidityDelta
  ) internal returns (bool flipped) {
    Tick.Info storage tickInfo = self[tick];
    uint128 liquidityBefore = tickInfo.tickLiquidity;
    uint128 liquidityAfter = liquidityBefore + liquidityDelta;

    if (liquidityBefore == 0) {
        tickInfo.tickInitialized = true;
    }

    tickInfo.tickLiquidity = liquidityAfter;

    flipped = (liquidityAfter == 0) != (liquidityBefore == 0);
  }

}


