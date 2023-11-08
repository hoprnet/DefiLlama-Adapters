const sdk = require("@defillama/sdk");
const HoprSDK = require("@hoprnet/hopr-sdk");
const { getLogs } = require('../helper/cache/getLogs')
const { unwrapUniswapLPs, sumTokens2, } = require('../helper/unwrapLPs');
const { BigNumber } = require("ethers");

const wxHOPR_TOKEN_SMART_CONTRACT_ADDRESS  = HoprSDK.web3.wxHOPR_TOKEN_SMART_CONTRACT_ADDRESS;
const xHOPR_TOKEN_SMART_CONTRACT_ADDRESS  = HoprSDK.web3.xHOPR_TOKEN_SMART_CONTRACT_ADDRESS;
const HOPR_CHANNELS = HoprSDK.web3.DUFOUR.addresses.channels;
const SAFE_FACTORY = HoprSDK.web3.DUFOUR.addresses.node_stake_v2_factory;
const TOKEN_DECIMALS = 18;


function tvl(chain) {
  return async (timestamp, ethBlock, chainBlocks, { api }) => {

    const logs = await getLogs({
      api,
      target: SAFE_FACTORY,
      topic: 'NewHoprNodeStakeSafe(address)',
      fromBlock: 29706820,
      eventAbi: 'event NewHoprNodeStakeSafe(address instance)'
    });

    const safes = logs.map(log => log.args[0]);
    const balanceOfSafes = await balanceOfs(wxHOPR_TOKEN_SMART_CONTRACT_ADDRESS, chain, safes);
    const balanceOfChannels = BigInt((
      await sdk.api.abi.call({
        abi: 'erc20:balanceOf',
        target: wxHOPR_TOKEN_SMART_CONTRACT_ADDRESS,
        params: HOPR_CHANNELS,
        chain
      })
    ).output);

    const BigIntTvl = balanceOfSafes + balanceOfChannels;

    const tvl = { [`xdai:${xHOPR_TOKEN_SMART_CONTRACT_ADDRESS}`]: BigIntTvl.toString() }
    
    return tvl
  }
}

async function balanceOfs(token, chain, accounts) {
  const results = (
    (await sdk.api.abi.multiCall({
      calls: accounts.map((account) => ({
        target: token,
        params: account,
      })),
      abi: "erc20:balanceOf",
      chain,
      requery: true,
    }))
  ).output;

  let sum = BigInt(0);
  results.forEach((safe) => {
    if (safe.success) {
      sum+= BigInt(safe.output);
    }
  })

  return sum;
};

// async function getTotalSupplywxHopr(){
//   const rez =  await sdk.api.abi.call({
//     target: wxHOPR_TOKEN_SMART_CONTRACT_ADDRESS,
//     abi: 'erc20:totalSupply',
//     block,
//     chain: 'xdai'
//   })
//   return rez.output;
// };

// async function getwxHoprInChannels(){
//   const rez =  await sdk.api.abi.call({
//     target: wxHOPR_TOKEN_SMART_CONTRACT_ADDRESS,
//     abi: 'erc20:balanceOf',
//     block,
//     chain: 'xdai',
//     params: [HOPR_CHANNELS],
//   })
//   return rez.output;
// };

// async function tvl(){
//   const totalTokensInSafes = await getwxHoprInSafes();
//   const totalTokensInChannels = await getwxHoprInChannels();
//   return parseFloat(totalTokensInSafes) + parseFloat(totalTokensInChannels);
// }

module.exports = {
  xdai: {
    tvl: tvl('xdai'),
  },
  methodology: 'Aelin TVL consists of purchaseTokens held by pools, as well as AELIN token (staking) and LP (pool2) staked to receive a share of the revenue',
};