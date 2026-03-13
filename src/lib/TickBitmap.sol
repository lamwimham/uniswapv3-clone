// SPDX-License-Identifier: MIT

pragma solidity ^0.8.30;

import "./BitMath.sol";

library TickBitmap {
    // 每个 int16 可以表示 256 个 tick 的 bitmap
    // 例如，key = 0 表示 ticks [-128, 127] 的 bitmap，key = 1 表示 ticks [128, 383] 的 bitmap，以此类推
    function setTick(
        mapping(int16 => uint256) storage self,
        int24 tick,
        bool isActive
    ) internal {
        int16 wordPos = int16(tick >> 8); // 每个 word 包含 256 个 tick
        uint8 bitPos = uint8(uint24(tick) & 0xFF); // 在 word 中的具体位置
        if (isActive) {
            self[wordPos] |= (1 << bitPos); // 设置对应位为1
        } else {
            self[wordPos] &= ~(1 << bitPos); // 设置对应位为0
        }
    }

    function isTickActive(
        mapping(int16 => uint256) storage self,
        int24 tick
    ) internal view returns (bool) {
        int16 wordPos = int16(tick >> 8);
        uint8 bitPos = uint8(uint24(tick) & 0xFF);
        return (self[wordPos] & (1 << bitPos)) != 0; // 检查对应位是否为1
    }

    function position(
        int24 tick
    ) internal pure returns (int16 wordPos, uint8 bitPos) {
        wordPos = int16(tick >> 8); // 获取tick的索引
        bitPos = uint8(uint24(tick) & 0xFF); // 获取tick在索引中的位置
        return (wordPos, bitPos);
    }

    /// @notice 翻转tick的状态（如果原来是active则变为inactive，反之亦然）
    function flipTick(
        mapping(int16 => uint256) storage self,
        int24 tick,
        int24 tickSpacing
    ) internal {
        require(tick % tickSpacing == 0, "Tick spacing not met"); // 检查tick是否符合要求，可以根据需要修改，不是所有的tick都可以添加流动性
        
        (int16 wordPos, uint8 bitPos) = position(tick);

        uint256 mask = (1 << bitPos); // 创建一个mask
        self[wordPos] ^= mask; // 翻转对应位
    }

    /// @notice 获取下一个初始化tick
    function nextInitializedTickWithinOneWord(
        mapping(int16 => uint256) storage self,
        int24 tick,
        int24 tickSpacing,
        bool lte
    ) internal view returns (int24 next, bool initialized) {
        require(tick % tickSpacing == 0, "Tick spacing not met");
        int24 compressed = tick / tickSpacing; // 将tick压缩到tickSpacing的倍数

        if (lte) {
            // 卖出x代币(x贬值)
            (int16 wordPos, uint8 bitPos) = position(compressed); // 当前位置的索引和位位置
            uint256 mask = (1 << bitPos) - 1 + (1 << bitPos); // 创建一个mask，包含当前位置及右侧的所有位设为1
            uint256 masked = self[wordPos] & mask; // 将bitmap与mask进行位与运算，得到当前位置及右侧的状态
            initialized = masked != 0; // 如果masked不为0，说明当前位置及右侧至少有一个tick是active的，则初始化成功
            next = initialized
                ? (compressed -
                    int24(
                        uint24(bitPos - BitMath.mostSignificantBit(masked))
                    )) * tickSpacing
                : (compressed - int24(uint24(bitPos))) * tickSpacing;
        } else {
            // 卖出y代币
            (int16 wordPos, uint8 bitPos) = position(compressed + 1);
            uint256 mask = ~((1 << bitPos) - 1); // 右侧填满1后取反
            uint256 masked = self[wordPos] & mask;
            initialized = masked != 0;
            // 溢出/下溢是可能的，但通过限制tickSpacing和tick来防止
            next = initialized
                ? (compressed +
                    1 +
                    int24(
                        uint24((BitMath.leastSignificantBit(masked) - bitPos))
                    )) * tickSpacing
                : (compressed + 1 + int24(uint24((type(uint8).max - bitPos)))) *
                    tickSpacing;
        }
    }
}
