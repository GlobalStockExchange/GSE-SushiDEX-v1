import { Log } from 'viem'

import { UniV3PoolWatcher } from './UniV3PoolWatcher'
import { warnLog } from './WarnLog'

const delay = async (ms: number) => new Promise((res) => setTimeout(res, ms))

export enum PoolSyncState {
  LiquidityMismatch = 'liquidity mismatch',
  PriceMismatch = 'price mismatch',
  CurrentTickMicmatch = 'tick mismatch',
  TicksStartMismatch = 'ticks start mismatch',
  TicksFinishMismatch = 'ticks finish mismatch',
  TicksMismatch = 'ticks mismatch',
  ReservesMismatch = 'reserves mismatch',
  Match = 'data 100% correct',
  CheckFailed = 'check failed',
}

export type QualityCheckerCallBack = (arg: [UniV3PoolWatcher | undefined, PoolSyncState]) => void

export class QualityChecker {
  readonly checkAfterLogsNumber: number
  readonly callBack
  checkingPools: Map<string, UniV3PoolWatcher> = new Map()
  poolsLogCounter: Map<string, number> = new Map()
  totalCheckCounter = 0
  totalMatchCounter = 0

  constructor(checkAfterLogsNumber: number, callBack: QualityCheckerCallBack) {
    this.checkAfterLogsNumber = checkAfterLogsNumber
    this.callBack = callBack
  }

  async check(
    pool: UniV3PoolWatcher,
    newPool: UniV3PoolWatcher
  ): Promise<[UniV3PoolWatcher | undefined, PoolSyncState]> {
    try {
      await newPool.updatePoolState()
      for (;;) {
        await delay(1000)
        if (newPool.isStable() && pool.isStable() && pool.state && newPool.state) {
          this.totalCheckCounter++
          if (pool.state.liquidity !== newPool.state.liquidity) return [newPool, PoolSyncState.LiquidityMismatch]
          if (pool.state.sqrtPriceX96 !== newPool.state.sqrtPriceX96) return [newPool, PoolSyncState.PriceMismatch]
          if (pool.state.tick !== newPool.state.tick) return [newPool, PoolSyncState.CurrentTickMicmatch]
          const ticks0 = pool.getTicks()
          const ticks1 = newPool.getTicks()
          const start = ticks0.findIndex((t) => t.index == ticks1[0].index)
          if (start == -1) return [newPool, PoolSyncState.TicksStartMismatch]
          if (ticks0.length < start + ticks1.length) [newPool, PoolSyncState.TicksFinishMismatch]
          for (let i = 0; i < ticks1.length; ++i) {
            if (ticks0[i + start].index !== ticks1[i].index || !ticks0[i + start].DLiquidity.eq(ticks1[i].DLiquidity))
              return [newPool, PoolSyncState.TicksMismatch]
          }
          this.totalMatchCounter++
          if (pool.state.reserve0 !== newPool.state.reserve0 || pool.state.reserve1 !== newPool.state.reserve1)
            return [newPool, PoolSyncState.ReservesMismatch]
          return [undefined, PoolSyncState.Match]
        }
      }
    } catch (e) {
      warnLog('Quality check error: ' + e)
      return [undefined, PoolSyncState.CheckFailed]
    }
  }

  processLog(l: Log, pool: UniV3PoolWatcher) {
    const addr = l.address.toLowerCase()
    const checkingPool = this.checkingPools.get(addr)
    if (checkingPool) checkingPool.processLog(l)
    else {
      const counter = this.poolsLogCounter.get(addr) || 0
      if (counter < this.checkAfterLogsNumber) this.poolsLogCounter.set(addr, counter + 1)
      else {
        const newPool = new UniV3PoolWatcher(
          pool.providerName,
          pool.address,
          pool.tickHelperContract,
          pool.token0,
          pool.token1,
          pool.fee,
          pool.client,
          pool.busyCounter
        )
        this.checkingPools.set(pool.address.toLowerCase(), newPool)
        this.check(pool, newPool).then((res) => {
          this.callBack(res)
          this.poolsLogCounter.set(addr, 0)
          this.checkingPools.delete(pool.address.toLowerCase())
        })
      }
    }
  }
}
