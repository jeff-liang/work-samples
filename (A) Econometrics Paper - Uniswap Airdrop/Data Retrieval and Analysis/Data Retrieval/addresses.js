const fetch = require('node-fetch');
const fs = require("fs");

module.exports = {
	getData: async function (key,tokenDistributor) {
		var result = [];
		var startBlock = 0;
		var stopTime = 1633046400; // Oct 1 2021 (UTC)
		var lastTime = 0;
			let txlist = await fetch('https://api.etherscan.io/api?module=account&action=txlist&address='+tokenDistributor+'&startBlock='+startBlock+'&apikey='+key);
			let data = await txlist.json();
			procdata = data.result;
			startBlock = procdata[procdata.length-1]['blockNumber'];
			lastTime = procdata[procdata.length-1]['timeStamp'];
			result.push.apply(result,procdata);
		
		return result;
	},

	// retrieve all addresses that initiated a claim from the airdrop before Oct 1 2021
	getAddresses: async function () {
		const tokenDistributor = "0x090d4613473dee047c3f2706764f49e0821d256e";

		claimData = await module.exports.getData(process.env.etherscan_key, tokenDistributor);
		console.log(claimData.length);
		filteredData = [];
		i = 0;
		while (1==1) { // remove duplicates and too late claims
			j = i+1;
			block = claimData[i]['blockNumber'];
			if (claimData[i]['timeStamp'] >= 1633046400) {
				break;
			}
			while (1==1) {
				if (claimData.length < j+1) {
					break;
				}
				if (claimData[j]['blockNumber'] !== block) {
					break;
				}
				j++;
			}
			blockData = claimData.slice(i,j);
			blockData = blockData.filter((thing,index,self) =>
				index === self.findIndex((t) => (
					t.hash === thing.hash
				))
			);
			filteredData.push.apply(filteredData,blockData);
			if (claimData.length < j+1) {
				break;
			}
			i = j;
		}
		console.log(filteredData.length);
		var address_list = {};
		for (index in filteredData) {
			var transaction = filteredData[index];
			if (transaction["from"] in address_list) {
				address_list[transaction["from"]].push(
				[transaction["hash"],
				transaction["blockNumber"],
				transaction["timeStamp"],
				transaction["nonce"],
				transaction["gasPrice"],
				transaction["isError"]]);
			}
			else {
				address_list[transaction["from"]] = [[transaction["hash"],
				transaction["blockNumber"],
				transaction["timeStamp"],
				transaction["nonce"],
				transaction["gasPrice"],
				transaction["isError"]]];
			}
		}
		data = [filteredData, address_list];
		fs.writeFileSync('./addresses.json',JSON.stringify(data));
	}
};

