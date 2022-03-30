const fs = require("fs");
const BigNumber = require('bignumber.js');

module.exports = {
	mergeData: function (newAddDetails) {
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
			
				bunch = newDetails.slice(1,-2);
				acc.push([addr,tr[addr][0][0],BigNumber(tr[addr][0][1]).div(10**18).toString(),...tr[addr][0].slice(2),EOA,ethBalance,...bunch,...relevTrans,numErrors]);
			}
		}
		counterparties = Object.entries(counterparties).sort(([,a],[,b])=>b-a);
		console.log(counterparties.slice(0,50));
		fs.writeFileSync('./data.json',JSON.stringify(acc));
	}
};