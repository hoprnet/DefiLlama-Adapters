const { sumUnknownTokens } = require('../helper/unknownTokens')

async function tvl(_, _b, _cb, { api, }) {
  const Indexer = '0x0336dfb02ba66ce75f5cc7898c3eafeddc493daf'
  let pools = await api.call({ abi: abi.getAllSaaSPools, target: Indexer })
  const isEnabled = await api.multiCall({ abi: abi.poolEnabled, calls: pools })
  pools = pools.filter((_, i) => isEnabled[i])
  const tokens = await api.multiCall({  abi: abi.stakedTokenAddress, calls: pools})
  const poolInfo = await api.multiCall({  abi: abi.pool, calls: pools})
  const bals = poolInfo.map(i => i.totalTokensStaked)
  api.addTokens(tokens, bals)
  const a = sumUnknownTokens({ api, useDefaultCoreAssets: true, lps: ['0x412cb411be14ec0ee87c2823f830d33dd37aa8f8']})

  const b = await a;

  // {
  //   "ethereum:0xe1bA035fE04200dA932378C4509e1fafDd08e187": "572814074628219140000000",
  //   "ethereum:0x670B73820441B54c118AE4546AAEE401d4DC7aa0": "344980757249",
  //   "ethereum:0xBb63E6BE33Bc5B5386d7ab0529Dc6C400F2AC2eC": "1172528365820575441612193",
  //   "ethereum:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "325748524089741800",
  // }

  return a;
}

module.exports = {
  ethereum: {
    tvl: () => ({}),
    staking: tvl,
  },
}

const abi = {
  "getAllSaaSPools": "address[]:getAllSaaSPools",
  "stakedTokenAddress": "address:stakedTokenAddress",
  "pool": "function pool() view returns (address creator, address tokenOwner, uint256 poolTotalSupply, uint256 poolRemainingSupply, uint256 totalTokensStaked, uint256 creationBlock, uint256 perBlockNum, uint256 lockedUntilDate, uint256 lastRewardBlock, uint256 accERC20PerShare, uint256 stakeTimeLockSec, bool isStakedNft, bytes32 website)",
  "poolEnabled": "bool:poolEnabled",
}