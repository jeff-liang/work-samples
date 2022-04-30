const fetch = require('node-fetch');
const fs = require("fs");
const _ = require('lodash');

const tokenDistributor = "0x090d4613473dee047c3f2706764f49e0821d256e";
const stopTime = 1633046400; // Oct 1 2021 (UTC)

module.exports = {
	// Retrieve transaction info from all interactions with the airdrop contract from the Etherscan API
	getData: async function () {
		var result = [];
		var startBlock = 0;
		var lastTime = 0;
		while (lastTime < stopTime) {
			let txlist = await fetch('https://api.etherscan.io/api?module=account&action=txlist&address='
				+ tokenDistributor + '&startBlock=' + startBlock + '&apikey=' + process.env.etherscan_key);
			let data = await txlist.json();
			procdata = data.result;
			startBlock = procdata[procdata.length-1]['blockNumber'];
			lastTime = procdata[procdata.length-1]['timeStamp'];
			result.push.apply(result,procdata);
		}
		return result;
	},

	// Retrieve all addresses that initiated a claim from the airdrop before Oct 1 2021
	// and group their transactions together
	getAddresses: async function () {
		claimData = await module.exports.getData();
		console.log("We have collected" + claimData.length + " transactions.");

		// remove duplicates and too late claims
		filteredData = _.filter(claimData, tx => tx['timeStamp'] < stopTime);
		filteredData = _.uniq(filteredData);
		
		console.log("After removing duplicate transactions and transactions that come after our \
			cutoff date, we have " + filteredData.length + " transactions left.");

		var addressList = _.groupBy(filteredData, tx => tx["from"]);
		_.forEach(addressList, (claimerTx, address) => addressList[address] = claimerTx.map(tx =>
			[tx["hash"],
			tx["blockNumber"],
			tx["timeStamp"],
			tx["nonce"],
			tx["gasPrice"],
			tx["isError"]]
		));
		data = [filteredData, addressList];
		fs.writeFileSync('./addresses.json',JSON.stringify(data));
	}
};
