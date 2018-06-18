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
	console.log("\tRequest for Kiuwan, input data=" + JSON.stringify(data, null, 8) );
	
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

	// Remove  web client authorization header and insert new one with JWT token
	if (config.useLocalCredentialsToKiuwan) {
		requestData.headers['Authorization']= 'Basic ' +  Buffer.from(req.user.kiuwanUN + ':' + req.user.kiuwanPW).toString('base64');
		console.log("\tUsing Kiuwan credentials included in JWT token: ", requestData.headers['Authorization'] );
	}else{
		console.log("\tUsing Kiuwan credentials included in request data (json), not JWT credentials: ", data.headers['Authorization'] );
	}
	
	// Remove proxy agent if not needed
	if (!config.useProxy) {
		delete requestData.agent;
	}
	
	// Remove json  if not needed
	if (!data.method == "POST") {
		delete requestData.json;
	}

	console.log("\tSending request to Kiuwan, data="+ JSON.stringify(requestData, null, 8)   );
	

	request(
		requestData,
		function(error, response, body) {
			if (error) {
				console.log('\tError: ', error);
				res.status(400).send('Request to Kiuwan error:' + error);
			}
			console.log('\tKiuwan response ok');

		}
	).pipe(res);



}

function getKiuwanStatistics(req, res) {
	var aggregatorField = req.query.agg;
	console.log ('\tUser Data[in JWT token]:', req.user.username );
	console.log ('\tgetKiuwanStatistics grouped by element:', aggregatorField  );
	kiuSrv.getKiuwanStatistics( req.query.agg )
		.then(function (data) {
			if (data) {
				res.send(data);
				console.log ('\tOK<-getKiuwanStatistics');
			} else {
				res.sendStatus(404);
			}
		})
		.catch(function (err) {
			res.status(400).send(err);
		});
	
}




function status(req, res) {
	console.log ('\tUser Data[in JWT token]:', req.user.username );
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
	
	console.log ('\tLOAD KIUWAN DB IN LOCAL MONGO  \tUser Data[in JWT token]:', req.user.username );
	var kiuwanAuthToken = null;
	if (config.useLocalCredentialsToKiuwan) {
		kiuwanAuthToken =  ( req.user && req.user.kiuwanUN && req.user.kiuwanPW ) ? 
			'Basic ' +  Buffer.from(req.user.kiuwanUN + ':' + req.user.kiuwanPW).toString('base64') : null;
		console.log("\t\tUsing Kiuwan credentials included in JWT token: ", kiuwanAuthToken );
	}else{
		kiuwanAuthToken = ( req.query && req.query.Authorization )?  req.query.Authorization : null;
		console.log("\t\tUsing Kiuwan credentials included in headers, not JWT credentials: ", kiuwanAuthToken );
	}

	if(kiuwanAuthToken){
		kiuSrv.load( kiuwanAuthToken )
			.then(function (data) {
				if (data.result.n == 1 ) { // && data['n'] && data['n'] == 1  @aaa @TODO controlde numero de documentos devueltos
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
	}else{
		res.status(400).send("No auth data");
	}

}
