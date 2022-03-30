// This script retrieves all the data we need for the paper and saves it to files.
// It takes a while to run. Ask me for the API keys if you want to run it.

require('dotenv').config();
var getAddr = require('./addresses.js');
var getTrueRecip = require('./getTrueRecipients.js');
var getLogs = require('./getLogs.js');
var mergeData = require('./mergeData.js');

const fs = require("fs");

async function main() {
	if (!fs.existsSync('./addresses.json')) {
		await getAddr.getAddresses();
	}
	var addData = JSON.parse(fs.readFileSync('./addresses.json'));
	const addresses = addData[1];
	if (!fs.existsSync('./trueRecipients.json')) {
		await getTrueRecip.getTrueAirdropRecipients(addData, 0, {});
	}
	else{
		var trueRecipients = JSON.parse(fs.readFileSync('./trueRecipients.json'));
		if (trueRecipients[0] != Object.keys(addresses).length) {
			await getTrueRecip.getTrueAirdropRecipients(addData,trueRecipients[0],trueRecipients[1]);
		}
	}
	addData = null;
	trueRecipients = JSON.parse(fs.readFileSync('./trueRecipients.json'));
	if (trueRecipients.length < 3) {
		getTrueRecip.processTrueRecipients(trueRecipients);
	}
	trueRecipients = JSON.parse(fs.readFileSync('./trueRecipients.json'));
	if (!fs.existsSync('./logs.json')) {
		await getLogs.saveLogs(Object.keys(trueRecipients[2]).sort(),0,{});
	}
	else{
		var logs = JSON.parse(fs.readFileSync('./logs.json'));
		if (logs[0] != Object.keys(trueRecipients[2]).length) {
			await getLogs.saveLogs(Object.keys(trueRecipients[2]).sort(),logs[0],logs[1]);
		}
	}
	var logs = JSON.parse(fs.readFileSync('./logs.json'));
	if(!fs.existsSync('./newAddressDetails.json')){
		await getLogs.processLogs(0,{},{},logs[1],trueRecipients[2]);
	}
	else {
		var newDetails = JSON.parse(fs.readFileSync('./newAddressDetails.json'));
		if (newDetails[0] !== Object.keys(logs[1]).length){
			await getLogs.processLogs(newDetails[0],newDetails[1],newDetails[2],logs[1],trueRecipients[2]);
		}
	}
	var newDetails = JSON.parse(fs.readFileSync('./newAddressDetails.json'));
	mergeData.mergeData(newDetails);
	console.log('All done!');
}

main();