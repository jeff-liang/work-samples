const fs = require("fs");
const BigNumber = require('bignumber.js');
const _ = require('lodash');

module.exports = {
	mergeData: function (newAddDetails) {
		const tr = JSON.parse(fs.readFileSync('./trueRecipients.json'))[2];
		const add = JSON.parse(fs.readFileSync('./addresses.json'));
		var data = [['Recipient','Claim Block Number','Airdrop Amount','Claim Tx Hash',
		'Claim Tx Index','Claimer','Claimer = Recipient','Recipient EOA','Ether Balance',
		'Other UNI Received','Both Transfer and Received in a Single Block',
		'Transferred to EOA','Completely Sold in One Transaction','Completely Sold',
		'Total UNI Sold','Number of Sales','Number of Transfers Away',
		'Number of Transfers Received','Index of Transfers Away',
		'Index of Transfers Received','Block Number of Last Sale','Amount Transferred to EOAs',
		'Amount Swapped','Claim Hash','Claim Block Number','Claim Timestamp','Claim Nonce',
		'Claim Gas Price','Claim Error','Number of Claim Errors']];
		const addresses = Object.keys(tr);
		var counterparties = {};

		_.forEach(addresses, (addr) => {
			const claimer = tr[addr][0][4];
			const relevTrans = add[1][claimer].filter(elem => elem[0] === tr[addr][0][2])[0];

			var numErrors = 0;
			if ("0x"+addr.slice(26) == claimer) {
				const claimAttempts = add[1][claimer];
				numErrors = _.reduce(claimAttempts,(acc, tx) => acc + parseInt(tx[5]), 0);
			}

			const newDetails = newAddDetails[1][addr];
			if (newDetails) {
				const sales = newDetails[0];
				const theirCParties = _.countBy(sales, sale => sale[1]);
				_.mergeWith(counterparties, theirCParties, (accCParty, newCParty) => accCParty + newCParty);
				
				const airdropAmount = BigNumber(tr[addr][0][1]).div(10**18).toString();
				const EOA = newDetails[15];
				const ethBalance = BigNumber(newDetails[16]).div(10**18).toString();
				const relevVars = newDetails.slice(1,-2);

				data.push([addr,tr[addr][0][0],airdropAmount, ...tr[addr][0].slice(2),
					EOA,ethBalance,...relevVars,...relevTrans,numErrors]);
			}
		});
		counterparties = Object.entries(counterparties).sort(([,a],[,b])=>b-a);
		console.log(counterparties.slice(0,50));
		fs.writeFileSync('./data.json',JSON.stringify(data));
	}
};
