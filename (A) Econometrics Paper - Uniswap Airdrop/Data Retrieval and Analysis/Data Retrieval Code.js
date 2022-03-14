// This script retrieves all the data we need for the paper and saves it to files.
// It takes a while to run. Ask me for the API keys if you want to run it.

require('dotenv').config();

const fetch = require('node-fetch');
const fs = require("fs");
const web3 = require('web3');
const eth = new web3(`https://mainnet.infura.io/v3/${process.env.PROJECT_ID}`); // regular ethereum node
const archive = new web3(`https://api.archivenode.io/${process.env.ARCHIVE_PROJECT_ID}`); // need an archive node
const BigNumber = require('bignumber.js');

var headers = {
	'Content-Type': 'application/json'
};

async function getData(key,tokenDistributor) {
	var result = [];
	var startBlock = 0;
	var stopTime = 1633046400; // Oct 1 2021 (UTC)
	var lastTime = 0;
	while (lastTime < stopTime) {
		let txlist = await fetch('https://api.etherscan.io/api?module=account&action=txlist&address='+tokenDistributor+'&startBlock='+startBlock+'&apikey='+key);
		let data = await txlist.json();
		procdata = data.result;
		startBlock = procdata[procdata.length-1]['blockNumber'];
		lastTime = procdata[procdata.length-1]['timeStamp'];
		result.push.apply(result,procdata);
	}
	return result;
}

// retrieve all addresses that initiated a claim from the airdrop before Oct 1 2021
async function getAddresses() {
	const tokenDistributor = "0x090d4613473dee047c3f2706764f49e0821d256e";

	claimData = await getData(process.env.etherscan_key, tokenDistributor);
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

// retrieve all addresses that received an airdrop from a claim transaction
async function getTrueAirdropRecipients(data, i, acc) {
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
}

function processTrueRecipients(data) {
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

function mergeData(newAddDetails) {
	const tr = JSON.parse(fs.readFileSync('./trueRecipients.json'))[2];
	const add = JSON.parse(fs.readFileSync('./addresses.json'));
	var acc = [['Recipient','Claim Block Number','Airdrop Amount','Claim Tx Hash','Claim Tx Index','Claimer','Claimer = Recipient','Recipient EOA','Ether Balance','Other UNI Received',
	'Both Transfer and Received in a Single Block','Transferred to EOA','Completely Sold in One Transaction','Completely Sold','Total UNI Sold','Number of Sales','Number of Transfers Away',
	'Number of Transfers Received','Index of Transfers Away','Index of Transfers Received','Block Number of Last Sale','Amount Transferred to EOAs','Amount Swapped','Claim Hash','Claim Block Number','Claim Timestamp','Claim Nonce',
	'Claim Gas Price','Claim Error','Number of Claim Errors']];
	const addresses = Object.keys(tr);
	var counterparties = {};
	for (index in addresses) {
		const addr = addresses[index];
		const claimer = tr[addr][0][4];
		const relevTrans = add[1][claimer].filter(elem => elem[0] == tr[addr][0][2])[0];
		var numErrors = 0;
		if ("0x"+addr.slice(26) == claimer) {
			const claimAttempts = add[1][claimer];
			for (var i = 0; i<claimAttempts.length;i++){
				if (claimAttempts[i][5] == '1'){
					numErrors = numErrors + 1;
				}
			}
		}
		var EOA;
		var ethBalance;
		const newDetails = newAddDetails[1][addr];
		var bunch;
		if (newDetails) {
			const sales = newDetails[0];
			for (var i=0;i<sales.length;i++){
				const counterparty = sales[i][1];
				if (counterparty in counterparties){counterparties[counterparty] = counterparties[counterparty] + 1;}
				else{ counterparties[counterparty] = 1;}
			}
			EOA = newDetails[15];
			ethBalance = BigNumber(newDetails[16]).div(10**18).toString();
		
			bunch = newDetails.slice(1);
			acc.push([addr,tr[addr][0][0],BigNumber(tr[addr][0][1]).div(10**18).toString(),...tr[addr][0].slice(2),EOA,ethBalance,...bunch,...relevTrans,numErrors]);
		}
	}
	counterparties = Object.entries(counterparties).sort(([,a],[,b])=>b-a);
	console.log(counterparties.slice(0,50));
	fs.writeFileSync('./data.json',JSON.stringify(acc));
}

async function saveLogs(addresses,i,acc) {
	const transferSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
	const uniTokenAddress = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
	for (var count = i; count < addresses.length ;count++){
			if (count % 1000 == 999) { 
				fs.writeFileSync('./logs.json',JSON.stringify([count,acc]));
				fs.writeFileSync('./logsBackup.json',JSON.stringify([count,acc]));
				console.log(count.toString() + ' out of ' + addresses.length.toString());
			}
			var address = addresses[count];
			try{
			var logsfrom = await eth.eth.getPastLogs({
				fromBlock: '0x0',
				toBlock: '0xcb66aa',
				address: uniTokenAddress,
			topics: [transferSignature, address]});
			var logsto = await eth.eth.getPastLogs({
				fromBlock: '0x0',
				toBlock: '0xcb66aa',
				address: uniTokenAddress,
			topics: [transferSignature,null,address]});
			acc[address] = [logsfrom, logsto];
			}
			catch (err){
				console.error(err);
				if(! err.toString().includes("query returned more than 10000 results")) {throw 'Error!';}
			}
	}
	fs.writeFileSync('./logs.json',JSON.stringify([count,acc]));
	fs.writeFileSync('./logsBackup.json',JSON.stringify([count,acc]));
	console.log('Logs saving completed!');
}

// retrieve needed information about recipients of the airdrop
async function processLogs(i, acc, destinationContract, data, details) {
	const addresses = Object.keys(data);
	const swaps = ["0x000000000000000000000000d3d2e2692501a5c9ca623199d38826e513033a17",'0x0000000000000000000000005ac13261c181a9c3938bfe1b649e65d10f98566b',
	'0x000000000000000000000000ebfb684dd2b01e698ca6c14f10e4f289934a54d6','0x000000000000000000000000f00e80f0de9aea0b33aa229a4014572777e422ee',
	'0x00000000000000000000000074de5d4fcbf63e00296fd95d33236b9794016631','0x00000000000000000000000011111254369792b2ca5d084ab5eea397ca8fa48b',
	'0x0000000000000000000000002336caa76eb0c28597c691679988a5bcf5806e11','0x000000000000000000000000798934cdcfae18764ef4819274687df3fb24b99b',
	'0x000000000000000000000000dafd66636e2561b0284edde37e42d192f2844d40','0x0000000000000000000000001d42064fc4beb5f8aaf85f4617ae8b3b5b8bd801'];
	
	for (var count = i; count < addresses.length; count++){
		if (count % 1000 == 999) { 
			fs.writeFileSync('./newAddressDetails.json',JSON.stringify([count,acc,destinationContract]));
			fs.writeFileSync('./newAddressDetailsBackup.json',JSON.stringify([count,acc,destinationContract]));
			console.log(count.toString() + ' out of ' + addresses.length.toString());
		}
		
		const address = addresses[count];
		const airdropTransaction = details[address][0][2];
		const airdropAmount = BigNumber(details[address][0][1]);
		const logsfrom = data[address][0];
		const logsto = data[address][1];

		var code = await eth.eth.getCode("0x"+address.slice(26));
		var ethBalance = await archive.eth.getBalance("0x"+address.slice(26),"0xA5F138");
			
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
				var fromlog = logsfrom[indexfrom];
				var tolog = logsto[indexto];
				if (fromlog == undefined && tolog == undefined) {break;}
				if (fromlog == undefined || tolog == undefined) {
					if (fromlog == undefined){
						if (tolog['transactionHash'] != airdropTransaction) {
							otherUNI = true;
							break;
						}
						indexto = indexto + 1;
					}
					if (tolog == undefined) {
						var recipientContract = false;
						if (!(fromlog['topics'][2] in destinationContract)){ destinationContract[fromlog['topics'][2]] = (await eth.eth.getCode("0x"+fromlog['topics'][2].slice(26))) != "0x"; }
						if (destinationContract[fromlog['topics'][2]]){recipientContract = true;}
						if (! recipientContract) {
							EOAtransfer = true;
							EOATransAmnt = EOATransAmnt.plus(BigNumber(fromlog['data']));
						}
						if (amountSold.eq(0) && BigNumber(fromlog['data']).eq(airdropAmount)) {
							oneShotSold = true;
							amountSold = airdropAmount;
							if (swaps.includes(fromlog['topics'][2])){swap = airdropAmount;}
							sales.push([fromlog['data'],fromlog['topics'][2],fromlog['transactionHash'],fromlog['blockNumber']]);
							break;
						}
						sales.push([fromlog['data'],fromlog['topics'][2],fromlog['transactionHash'],fromlog['blockNumber']]);
						amountSold = amountSold.plus(BigNumber(fromlog['data']));
						if (swaps.includes(fromlog['topics'][2])){swap = swap.plus(BigNumber(fromlog['data']));}
						if (amountSold.eq(airdropAmount)){break;}
						indexfrom = indexfrom + 1;
					}
				}
				else {
					if (fromlog['blockNumber'] > tolog['blockNumber']){
						if (tolog['transactionHash'] != airdropTransaction) {
							otherUNI = true;
							break;
						}
						indexto = indexto + 1;
					}
					if (fromlog['blockNumber'] < tolog['blockNumber']){
						var recipientContract = false;
						if (!(fromlog['topics'][2] in destinationContract)){ destinationContract[fromlog['topics'][2]] = (await eth.eth.getCode("0x"+fromlog['topics'][2].slice(26))) != "0x"; }
						if (destinationContract[fromlog['topics'][2]]){recipientContract = true;}
						if (! recipientContract) {
							EOAtransfer = true;
							EOATransAmnt = EOATransAmnt.plus(BigNumber(fromlog['data']));
						}
						if (amountSold.eq(0) && BigNumber(fromlog['data']).eq(airdropAmount)) {
							oneShotSold = true;
							amountSold = airdropAmount;
							if (swaps.includes(fromlog['topics'][2])){swap = airdropAmount;}
							sales.push([fromlog['data'],fromlog['topics'][2],fromlog['transactionHash'],fromlog['blockNumber']]);
							break;
						}
						sales.push([fromlog['data'],fromlog['topics'][2],fromlog['transactionHash'],fromlog['blockNumber']]);
						amountSold = amountSold.plus(BigNumber(fromlog['data']));
						if (swaps.includes(fromlog['topics'][2])){swap = swap.plus(BigNumber(fromlog['data']));}
						if (amountSold.eq(airdropAmount)){break;}
						indexfrom = indexfrom + 1;
					}
					if (fromlog['blockNumber'] == tolog['blockNumber']){
						bothTransfer = true;
						break;
					}
				}
			}
			var lastSale = 0;
			if (sales.length > 0) {lastSale = sales[sales.length-1][3];}
			acc[address] = [sales,otherUNI,bothTransfer,EOAtransfer,oneShotSold,amountSold.eq(airdropAmount),
			amountSold.div(10**18).toString(),sales.length,logsfrom.length,logsto.length,indexfrom,indexto,lastSale,
			EOATransAmnt.div(10**18).toString(),swap.div(10**18).toString(), code, ethBalance];
		
	}
	fs.writeFileSync('./newAddressDetails.json',JSON.stringify([count,acc,destinationContract]));
	console.log('Processing logs completed!');
}

async function main() {
	if (!fs.existsSync('./addresses.json')) {
		await getAddresses();
	}
	var addData = JSON.parse(fs.readFileSync('./addresses.json'));
	const addresses = addData[1];
	if (!fs.existsSync('./trueRecipients.json')) {
		await getTrueAirdropRecipients(addData, 0, {});
	}
	else{
		var trueRecipients = JSON.parse(fs.readFileSync('./trueRecipients.json'));
		if (trueRecipients[0] != Object.keys(addresses).length) {
			await getTrueAirdropRecipients(addData,trueRecipients[0],trueRecipients[1]);
		}
	}
	addData = null;
	trueRecipients = JSON.parse(fs.readFileSync('./trueRecipients.json'));
	if (trueRecipients.length < 3) {
		processTrueRecipients(trueRecipients);
	}
	trueRecipients = JSON.parse(fs.readFileSync('./trueRecipients.json'));
	if (!fs.existsSync('./logs.json')) {
		await saveLogs(Object.keys(trueRecipients[2]).sort(),0,{});
	}
	else{
		var logs = JSON.parse(fs.readFileSync('./logs.json'));
		if (logs[0] != Object.keys(trueRecipients[2]).length) {
			await saveLogs(Object.keys(trueRecipients[2]).sort(),logs[0],logs[1]);
		}
	}
	var logs = JSON.parse(fs.readFileSync('./logs.json'));
	if(!fs.existsSync('./newAddressDetails.json')){
		await processLogs(0,{},{},logs[1],trueRecipients[2]);
	}
	else {
		var newDetails = JSON.parse(fs.readFileSync('./newAddressDetails.json'));
		if (newDetails[0] !== Object.keys(logs[1]).length){
			await processLogs(newDetails[0],newDetails[1],newDetails[2],logs[1],trueRecipients[2]);
		}
	}
	var newDetails = JSON.parse(fs.readFileSync('./newAddressDetails.json'));
	mergeData(newDetails);
	console.log('All done!');
}

main();