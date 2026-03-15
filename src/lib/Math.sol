// SPDX-License-Identifier: MIT

pragma solidity ^0.8.30;

import "./FullMath.sol";

import "./FixedPointX96.sol";



library Math {
    uint256 private constant RESOLUTION = FixedPoint96.RESOLUTION;
    uint256 private constant Q96 = FixedPoint96.Q96;

    function calcAmount0Delta(
        uint160 sqrtPriceAX96,
        uint160 sqrtPriceBX96,
        uint128 liquidity
    ) internal pure returns (uint256 amount0) {
        if (sqrtPriceAX96 > sqrtPriceBX96)
            (sqrtPriceAX96, sqrtPriceBX96) = (sqrtPriceBX96, sqrtPriceAX96);

        require(sqrtPriceAX96 > 0);

        amount0 = FullMath.divRoundingUp(
            FullMath.mulDivRoundingUp(
                (uint256(liquidity) << RESOLUTION),
                (sqrtPriceBX96 - sqrtPriceAX96),
                sqrtPriceBX96
            ),
            sqrtPriceAX96
        );
    }

    function calcAmount1Delta(
        uint160 sqrtPriceAX96,
        uint160 sqrtPriceBX96,
        uint128 liquidity
    ) internal pure returns (uint256 amount1) {
        if (sqrtPriceAX96 > sqrtPriceBX96)
            (sqrtPriceAX96, sqrtPriceBX96) = (sqrtPriceBX96, sqrtPriceAX96);

        amount1 = FullMath.mulDivRoundingUp(
            liquidity,
            (sqrtPriceBX96 - sqrtPriceAX96),
            Q96
        );
    }

    /**
    # When amount_in is token0 (zeroForOne = true)
      price_next = int((liq * q96 * sqrtp_cur) // (liq * q96 + amount_in * sqrtp_cur))
      # When amount_in is token1 (zeroForOne = false)
      price_next = sqrtp_cur - (amount_in * q96) // liq
    */
    function getNextSqrtPriceFromInput(
        uint160 sqrtPriceCurrentX96,
        uint128 liquidity,
        int256 amountRemaining,
        bool zeroForOne
    ) internal pure returns (uint160 sqrtPriceNextX96) {
        require(amountRemaining >= 0, "amountRemaining must be positive");
        uint256 amountIn = uint256(amountRemaining);
        sqrtPriceNextX96 = zeroForOne
            ? getNextSqrtPriceFromAmount0RoundingUp(
                sqrtPriceCurrentX96,
                liquidity,
                amountIn
            )
            : getNextSqrtPriceFromAmount1RoundingDown(
                sqrtPriceCurrentX96,
                liquidity,
                amountIn
            );
    }
    function getNextSqrtPriceFromAmount0RoundingUp(
        uint160 sqrtPriceX96,
        uint128 liquidity,
        uint256 amountIn
    ) internal pure returns (uint160) {
        uint256 numerator = uint256(liquidity) << FixedPoint96.RESOLUTION;
        uint256 product = amountIn * sqrtPriceX96;

        if (product / amountIn == sqrtPriceX96) {
            uint256 denominator = numerator + product;
            if (denominator >= numerator) {
                return
                    uint160(
                        FullMath.mulDivRoundingUp(numerator, sqrtPriceX96, denominator)
                    );
            }
        }

        // 低精度防溢出
        return
            uint160(
                FullMath.divRoundingUp(numerator, (numerator / sqrtPriceX96) + amountIn)
            );
    }

    function getNextSqrtPriceFromAmount1RoundingDown(
        uint160 sqrtPriceX96,
        uint128 liquidity,
        uint256 amountIn
    ) internal pure returns (uint160) {
        // When swapping token1 for token0:
        // - token1 enters pool, token0 leaves pool
        // - token1/token0 ratio INCREASES (token0 becomes more valuable)
        // - sqrtPrice = sqrt(token1/token0) INCREASES
        // sqrtPriceNext = sqrtPriceCurrent + (amountIn * Q96) / liquidity
        return
            sqrtPriceX96 +
            uint160((amountIn << FixedPoint96.RESOLUTION) / liquidity);
    }
}