const fs = require("fs");
const web3 = require('web3');
const eth = new web3(`https://mainnet.infura.io/v3/${process.env.PROJECT_ID}`); // regular ethereum node
const archive = new web3(`https://api.archivenode.io/${process.env.ARCHIVE_PROJECT_ID}`); // need an archive node
const BigNumber = require('bignumber.js');
const _ = require('lodash');

const transferSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const uniTokenAddress = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
const swaps = ["0x000000000000000000000000d3d2e2692501a5c9ca623199d38826e513033a17",
	'0x0000000000000000000000005ac13261c181a9c3938bfe1b649e65d10f98566b',
	'0x000000000000000000000000ebfb684dd2b01e698ca6c14f10e4f289934a54d6',
	'0x000000000000000000000000f00e80f0de9aea0b33aa229a4014572777e422ee',
	'0x00000000000000000000000074de5d4fcbf63e00296fd95d33236b9794016631',
	'0x00000000000000000000000011111254369792b2ca5d084ab5eea397ca8fa48b',
	'0x0000000000000000000000002336caa76eb0c28597c691679988a5bcf5806e11',
	'0x000000000000000000000000798934cdcfae18764ef4819274687df3fb24b99b',
	'0x000000000000000000000000dafd66636e2561b0284edde37e42d192f2844d40',
	'0x0000000000000000000000001d42064fc4beb5f8aaf85f4617ae8b3b5b8bd801'];

module.exports = {
	saveLogs: async function (addresses,i,acc) {
		_.forEach(addresses.slice(i), (address, index) => {
			const count = index + i;
			if (count % 1000 == 999) { 
				fs.writeFileSync('./logs.json',JSON.stringify([count,acc]));
				fs.writeFileSync('./logsBackup.json',JSON.stringify([count,acc]));
				console.log(`${count.toString()} out of ${addresses.length.toString()}`);
			}
			try{
				const logsFrom = await eth.eth.getPastLogs({
					fromBlock: '0x0',
					toBlock: '0xcb66aa',
					address: uniTokenAddress,
					topics: [transferSignature, address]});
				const logsTo = await eth.eth.getPastLogs({
					fromBlock: '0x0',
					toBlock: '0xcb66aa',
					address: uniTokenAddress,
					topics: [transferSignature,null,address]});
				acc[address] = [logsFrom, logsTo];
			}
			catch (err){
				console.error(err);
				if(! err.toString().includes("query returned more than 10000 results")) {throw 'Error!';}
			}
		});
		fs.writeFileSync('./logs.json',JSON.stringify([count,acc]));
		fs.writeFileSync('./logsBackup.json',JSON.stringify([count,acc]));
		console.log('Logs saving completed!');
	},

	// retrieve needed information about recipients of the airdrop
	processLogs: async function (i, acc, destinationContract, data, details) {
		const addresses = Object.keys(data).sort();
		
		_.forEach(addresses.slice(i), (address, index) => {
			const count = index + i;
			if (count % 1000 == 999) { 
				fs.writeFileSync('./newAddressDetails.json',JSON.stringify([count,acc,destinationContract]));
				fs.writeFileSync('./newAddressDetailsBackup.json',JSON.stringify([count,acc,destinationContract]));
				console.log(`${count.toString()} out of ${addresses.length.toString()}`);
			}
			
			const airdropTransaction = details[address][0][2];
			const airdropAmount = BigNumber(details[address][0][1]);
			const logsFrom = data[address][0];
			const logsTo = data[address][1];

			const formatAddress = "0x" + address.slice(26);
			const code = await eth.eth.getCode(formatAddress);
			const ethBalance = await archive.eth.getBalance(formatAddress,"0xA5F138");
				
			var indexfrom = 0;
			var indexto = 0;
			var otherUNI = false;
			var amountSold = BigNumber(0);
			var sales = [];
			var oneShotSold = false;
			var bothTransfer = false;
			var EOAtransfer = false;
			var EOATransAmnt = BigNumber(0);
			var swap = BigNumber(0);

			while (true) {
				const fromLog = logsFrom[indexfrom];
				const toLog = logsTo[indexto];
				if (fromLog == undefined && toLog == undefined) {break;}
				if (fromLog == undefined || (toLog && fromLog['blockNumber'] > toLog['blockNumber'])){
					if (toLog['transactionHash'] !== airdropTransaction) {
						otherUNI = true;
						break;
					}
					indexto++;
				}
				if (toLog == undefined || (fromLog && fromLog['blockNumber'] < toLog['blockNumber'])){
					const recipient = fromLog['topics'][2];
					const transferAmount = BigNumber(fromLog['data']);
					
					sales.push([fromLog['data'],recipient,fromLog['transactionHash'],fromLog['blockNumber']]);
					amountSold = amountSold.plus(transferAmount);
					if (swaps.includes(recipient)){swap = swap.plus(transferAmount);}

					if (!(recipient in destinationContract)){ 
						destinationContract[recipient] = 
						(await eth.eth.getCode("0x"+recipient.slice(26))) != "0x"; 
					}
					if (! destinationContract[recipient]) {
						EOAtransfer = true;
						EOATransAmnt = EOATransAmnt.plus(transferAmount);
					}
					if (amountSold.eq(0) && transferAmount.eq(airdropAmount)) {
						oneShotSold = true;
					}
					
					if (amountSold.eq(airdropAmount)){break;}
					indexfrom++;
				}
				if (fromLog && toLog && fromLog['blockNumber'] === toLog['blockNumber']) {
					bothTransfer = true;
					break;
				}
			}
			var lastSale = 0;
			if (sales.length > 0) {lastSale = sales[sales.length-1][3];}
			acc[address] = [sales,otherUNI,bothTransfer,EOAtransfer,oneShotSold,amountSold.eq(airdropAmount),
			amountSold.div(10**18).toString(),sales.length,logsFrom.length,logsTo.length,indexfrom,indexto,lastSale,
			EOATransAmnt.div(10**18).toString(),swap.div(10**18).toString(), code === "0x", ethBalance];
		});
		fs.writeFileSync('./newAddressDetails.json',JSON.stringify([count,acc,destinationContract]));
		console.log('Processing logs completed!');
	}
};
