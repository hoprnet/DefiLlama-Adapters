const sdk = require('@defillama/sdk');
const { staking } = require('../helper/staking')
const { pool2 } = require('../helper/pool2')
const { unwrapUniswapLPs, sumTokens2, } = require('../helper/unwrapLPs')
const { getLogs } = require('../helper/cache/getLogs')
const { default: BigNumber } = require('bignumber.js')

const aelin_data = {
  'ethereum': {
    logConfig: [
      { target: '0x2c0979b0de5f99c2bde1e698aeca13b55695951e', fromBlock: 13996006  },
      { target: '0x5541da82549d732878c4104c9887c408790397af', fromBlock: 13846412  },
    ],
    'graphUrl': 'https://api.thegraph.com/subgraphs/name/aelin-xyz/aelin',
    'AELIN_ETH_LP': '0x974d51fafc9013e42cbbb9465ea03fe097824bcc',
    'AELIN_ETH_staking': '0x944cb90082fc1416d4b551a21cfe6d7cc5447c80',
    'AELIN': '0xa9c125bf4c8bb26f299c00969532b66732b1f758'
  },
  'optimism': {
    logConfig: [
      { target: '0x9219f9f65b007fd3ba0b53762861f54062531a31', fromBlock: 2266169 },
      { target: '0x87525307974a312AF13a78041F88B0BAe23ebb10', fromBlock: 1487918 },
      { target: '0x914ffc8dc0678911aae77f51b8489d6e214da20f', fromBlock: 1971285 },
    ],
    'graphUrl': 'https://api.thegraph.com/subgraphs/name/aelin-xyz/optimism',
    'AELIN': '0x61BAADcF22d2565B0F471b291C475db5555e0b76',
    'AELIN_staking': '0xfe757a40f3eda520845b339c698b321663986a4d',
    'AELIN_ETH_LP': '0x665d8D87ac09Bdbc1222B8B9E72Ddcb82f76B54A',
    'AELIN_ETH_staking': '0x4aec980a0daef4905520a11b99971c7b9583f4f8',
    'vAELIN': '0x780f70882fF4929D1A658a4E8EC8D4316b24748A',
  },
}

function tvl(chain) {
  return async (timestamp, ethBlock, chainBlocks, { api }) => {
    const { logConfig } = aelin_data[chain]
    const logs = (await Promise.all(logConfig.map(({ target, fromBlock }) => getLogs({
      api,
      target,
      topics: ['0x2f9902ccfa1b25adff84fa12ff5b7cbcffcb5578f08631567f5173b39c3004fe'],
      fromBlock,
      eventAbi: 'event CreatePool(address indexed poolAddress, string name, string symbol, uint256 purchaseTokenCap, address indexed purchaseToken, uint256 duration, uint256 sponsorFee, address indexed sponsor, uint256 purchaseDuration, bool hasAllowList)'
    })
    ))).flat()

    const res = sumTokens2({ api, tokensAndOwners: logs.map(i => ([i.args.purchaseToken, i.args.poolAddress])) });
    const b = await res;

    // {
    //   "ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "105451938",
    // }

    // {
    //   "optimism:0xda10009cbd5d07dd0cecc66161fc93d7c9000da1": "501706399458448627",
    //   "optimism:0x8c6f28f2f1a3c87f0f938b96d27520d9751ec8d9": "144102735659196883982538",
    //   "optimism:0x7f5c764cbc14f9669b88837ca1490cca17c31607": "13004879063",
    //   "optimism:0x8700daec35af8ff88c16bdf0418774cb3d7599b4": "2500000000000000000",
    //   "optimism:0x94b008aa00579c1307b0ef2c499ad98a8ce58e58": "555198651",
    //   "optimism:0x4200000000000000000000000000000000000042": "30000000000000000",
    //   "optimism:0x4200000000000000000000000000000000000006": "2387882433588903",
    //   "optimism:0x780f70882ff4929d1a658a4e8ec8d4316b24748a": "2880221361097132411",
    // }

    return res;
  }
}


function stakingTVL(chain) {
  return async (timestamp, ethBlock, chainBlocks) => {
    if (chain === 'ethereum') {
      return {}
    }

    const staked = await staking(
      aelin_data[chain]['AELIN_staking'],
      aelin_data[chain]['AELIN'],
      chain
    )(timestamp, ethBlock, chainBlocks)
    return staked
  }
}

function pool2TVL(chain) {
  return async (timestamp, ethBlock, chainBlocks, { api }) => {
    const stakingContract = aelin_data[chain]['AELIN_ETH_staking']
    const lpToken = aelin_data[chain]['AELIN_ETH_LP']
    const block = api.block

    if (chain === 'ethereum') {
      const staked = await pool2(stakingContract, lpToken, chain)(timestamp, ethBlock, chainBlocks, { api })
      const aelin_addr = `ethereum:${aelin_data[chain]['AELIN']}`
      staked['AELIN'] = BigNumber(staked[aelin_addr]).div(1e18).toFixed(0)
      staked[aelin_addr] = 0
      return staked
    }
    else if (chain === 'optimism') {
      const balances = {}
      const transformAddress = (addr) => `${chain}:${addr}`;
      const { output: heldLPshares } = await sdk.api.abi.call({
        abi: 'erc20:balanceOf',
        target: lpToken,
        params: stakingContract,
        chain,
        block,
      })
      const lpBalances = [
        {
          balance: heldLPshares,
          token: lpToken
        }
      ]
      // Unwrao Gelato pools
      await unwrapUniswapLPs(balances, lpBalances, block, chain, transformAddress, [], 'gelato')
      return balances
    }
  }
}

module.exports = {
  ethereum: {
    tvl: tvl('ethereum'),
  },
  methodology: 'Aelin TVL consists of purchaseTokens held by pools, as well as AELIN token (staking) and LP (pool2) staked to receive a share of the revenue',
}
