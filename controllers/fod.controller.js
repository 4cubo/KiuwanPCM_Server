var config = require('../config.json');
var express = require('express');
var router = express.Router();
var kiuSrv = require('services/kiuwan.service');
//var requestService = require('services/request.service');
var request = require('request');

// For proxy agent
var HttpsProxyAgent = require('https-proxy-agent');

// routes
router.post('*', newRequest);
router.get('/status', status);
router.get('/load', loadData);
router.get('/statistics', getKiuwanStatistics);

module.exports = router;


var agent = null;
if (config.useProxy) {
	agent = new HttpsProxyAgent(config.proxyUrl);
}

//Bypass request from client to kiuwan, no service call!!!!!!
function newRequest(req, res) {
	var data = req.body;

	var requestData = {
		agent : agent, // for proxy configuration View SASTWebApp server.js
		url : config.kiuwanApiUrl + data.url,
		method : data.method,
		json : data.body,
		headers : {
			'Authorization' : data.headers['Authorization'],
			'Accept' : 'application/json;',
			'Content-Type' : 'application/json; charset=UTF-8'
		}
	};

	// Remove proxy agent if not needed
	if (!config.useProxy) {
		delete requestData.agent;
	}

	console.log("   Kiuwn Reques Data: ", req.body, requestData);

	request(
		requestData,
		function(error, response, body) {
			if (error) {
				console.log('error: ', error);
				res.status(400).send('Request to Kiuwan error:' + error);
			}
			console.log('Kiuwan res: ', body );

		}
	).pipe(res);



}

function getKiuwanStatistics(req, res) {
	var aggregatorField = req.query.agg;
	console.log ('paramtetro controller-------------->',  );
	kiuSrv.getKiuwanStatistics( req.query.agg )
		.then(function (data) {
			if (data) {
				res.send(data);
			} else {
				res.sendStatus(404);
			}
		})
		.catch(function (err) {
			res.status(400).send(err);
		});
	
}




function status(req, res) {
	
	kiuSrv.getStatus()
		.then(function (data) {
			if (data) {
				res.send(data);
			} else {
				res.sendStatus(404);
			}
		})
		.catch(function (err) {
			res.status(400).send(err);
		});
	
}

function loadData ( req, res){
	console.log("->1 ", req.query.Authorization );
	var kiuwanAuthToken = ( req.query && req.query.Authorization )?  req.query.Authorization : null;
	kiuSrv.load( kiuwanAuthToken )
		.then(function (data) {
			if (data.result.n === 1 ) { // && data['n'] && data['n'] == 1  @aaa @TODO controlde numero de documentos devueltos
				//console.log("OK", data);
				res.send(data.result);
			} else {
				console.log("ERROR", data);
				res.sendStatus(404);
			}
		})
		.catch(function (err) {
			console.log("->error", err);
			res.status(400).send(err);
		});

}
