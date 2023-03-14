import { UsePoolsParams } from '../types'
import { getAllPools } from './getAllPools'
import { convertPoolOrPairtoRPool } from '@sushiswap/amm/dist/Trade/convertPoolOrPairtoRPool'
import { ConstantProductPoolCode } from '@sushiswap/router/dist/pools/ConstantProductPool'
import { BridgeBento, ConstantProductRPool, StableSwapRPool } from '@sushiswap/tines'
import { BentoPoolCode } from '@sushiswap/router/dist/pools/BentoPool'
import { LiquidityProviders } from '@sushiswap/router'
import { BentoBridgePoolCode } from '@sushiswap/router/dist/pools/BentoBridge'
import { getBentoBoxContractConfig } from '../../../../hooks'
import { isBentoBoxV1ChainId } from '@sushiswap/bentobox'

export const getAllPoolsPcMap = async (variables: Omit<UsePoolsParams, 'enabled'>) => {
  const { pairs, stablePools, constantProductPools, bridgeBentoPools } = await getAllPools(variables)

  const rPools = [
    ...[...(pairs || []), ...(stablePools || []), ...(constantProductPools || [])].map(convertPoolOrPairtoRPool),
    ...(bridgeBentoPools || []),
  ]

  const bentoAddress = isBentoBoxV1ChainId(variables.chainId)
    ? getBentoBoxContractConfig(variables.chainId).address
    : undefined

  const pc = rPools.reduce<Record<string, ConstantProductPoolCode | BentoPoolCode>>((acc, cur) => {
    if (cur instanceof ConstantProductRPool) {
      acc[cur.address] = new ConstantProductPoolCode(cur, LiquidityProviders.SushiSwap, 'SushiSwap')
    }

    if (cur instanceof StableSwapRPool) {
      acc[cur.address] = new BentoPoolCode(cur, LiquidityProviders.Trident, 'Trident')
    }

    if (cur instanceof BridgeBento && bentoAddress) {
      acc[cur.address] = new BentoBridgePoolCode(cur, LiquidityProviders.Trident, 'Trident', bentoAddress)
    }

    return acc
  }, {})
}
