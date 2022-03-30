const fs = require("fs");
const fetch = require('node-fetch');

var headers = {
	'Content-Type': 'application/json'
};

module.exports = {
	// retrieve all addresses that received an airdrop from a claim transaction
	getTrueAirdropRecipients: async function (data, i, acc) {
		const transferSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
		const addresses = Object.keys(data[1]).sort();
		for (var count = i; count < addresses.length ;count ++) {
				if (count % 1000 == 999) { 
					fs.writeFileSync('./trueRecipients.json',JSON.stringify([count,acc]));
					console.log(count.toString() + ' out of ' + addresses.length.toString());
				}
				var address = addresses[count];
				var arrLogs = [];
				for (j in data[1][address]) {
					var dataString = JSON.stringify({jsonrpc:"2.0",method:"eth_getTransactionReceipt",params:[data[1][address][j][0]],id:1});
					var options = {
							method: 'POST',
							headers: headers,
							body: dataString,
						};
					const response = await fetch(`https://mainnet.infura.io/v3/${process.env.PROJECT_ID}`,options);
					const info = await response.json();
					arrLogs.push(info['result']['logs']);
				}
				acc[address] = arrLogs;
			
		}
		fs.writeFileSync('./trueRecipients.json',JSON.stringify([count,acc]));
	},

	processTrueRecipients: function (data) {
		const transferSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
		const tokenAddress = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";
		var processedData = {};
		const claimingAddresses = Object.keys(data[1]).sort();
		for (i in claimingAddresses) {
			for (j in data[1][claimingAddresses[i]]) {
				for (k in data[1][claimingAddresses[i]][j]) {
					const log = data[1][claimingAddresses[i]][j][k];
					if (log['address'] == tokenAddress && log['topics'][0] == transferSignature) {
						const recipient = log['topics'][2];
						const output = [log['blockNumber'],log['data'],log['transactionHash'],log['transactionIndex'],claimingAddresses[i],claimingAddresses[i] === "0x"+recipient.slice(26)];
						if (recipient in processedData) {
							processedData[recipient].push(output);
						}
						else{
							processedData[recipient] = [output];
						}
					}
				}
			}
		}
		const combined = data.concat(processedData);
		fs.writeFileSync('./trueRecipients.json',JSON.stringify(combined));
		console.log('Finished processing true recipients!');
	}
};