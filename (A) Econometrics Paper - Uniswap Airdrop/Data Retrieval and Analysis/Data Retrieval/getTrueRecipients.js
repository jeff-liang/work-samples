const fs = require("fs");
const fetch = require('node-fetch');
const _ = require('lodash');

const headers = {
	'Content-Type': 'application/json'
};
const transferSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const tokenAddress = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";

module.exports = {
	// retrieve all addresses that received an airdrop from a claim transaction
	getTrueAirdropRecipients: async function (data, i, acc) {
		
		const addresses = Object.keys(data[1]).sort();
		_.forEach(addresses.slice(i), (address, index) => {
			const count = index + i;
			if (count % 1000 == 999) { 
				fs.writeFileSync('./trueRecipients.json',JSON.stringify([count,acc]));
				console.log(`${count.toString()} out of ${addresses.length.toString()}`);
			}
			var arrLogs = [];
			_.forEach(data[1][address], (tx) => {
				const dataString = JSON.stringify({jsonrpc:"2.0",method:"eth_getTransactionReceipt",
					params:[tx[0]],id:1});
				const options = {
					method: 'POST',
					headers: headers,
					body: dataString,
				};
				const response = await fetch(`https://mainnet.infura.io/v3/${process.env.PROJECT_ID}`,options);
				const info = await response.json();
				arrLogs.push(info['result']['logs']);
			});
			acc[address] = arrLogs;
		});
		fs.writeFileSync('./trueRecipients.json',JSON.stringify([count,acc]));
	},

	processTrueRecipients: function (data) {
		var processedData = {};
		const claimingAddresses = Object.keys(data[1]).sort();

		_.forEach(data[1], (txGroup, claimer) => 
			_.forEach(txGroup, (tx) => 
				_.forEach(tx, (log) => {
					if (log['address'] === tokenAddress && log['topics'][0] === transferSignature) {
						const recipient = log['topics'][2];
						const output = {[recipient]: 
							[[log['blockNumber'],log['data'],log['transactionHash'],
							log['transactionIndex'],claimer, claimer === "0x"+recipient.slice(26)]]};
						_.mergeWith(processedData, output, (origData, newTx) => origData.concat(newTx));
					}
				})
			)
		);

		const combined = data.concat(processedData);
		fs.writeFileSync('./trueRecipients.json',JSON.stringify(combined));
		console.log('Finished processing true recipients!');
	}
};
