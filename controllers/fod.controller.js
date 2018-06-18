var config = require('../config.json');
var express = require('express');
var router = express.Router();
var fodSrv = require('services/fod.service');
//var requestService = require('services/request.service');
var request = require('request');
const http = require('http');

//require('request-debug')(request);

// For proxy agent
var HttpsProxyAgent = require('https-proxy-agent');

// routes
router.post('*', newRequest);
//router.get('/status', status);
//router.get('/load', loadData);
//router.get('/statistics', getKiuwanStatistics);

module.exports = router;


var agent = null;
if (config.useProxy) {
	agent = new HttpsProxyAgent(config.proxyUrl);
}

// qs is kind of FoD API uri querys /applications?orderBy=applicationCreatedDate&orderByDirection=DESC&offset=0&limit=50
function parseFoDQueryString(mongoCollection, qs) {
	var offset = 0, limit = 0;
	if (qs.indexOf('?')>0 && qs.indexOf('&')>0  ){
		var items = qs.split('?')[1].split('&');
		for (let iAux = 0; iAux < items.length; iAux++) {
			var splited = items[iAux].split('=');
			if (splited[0] == "offset") {
				offset = splited[1];
			} else if (splited[0] == "limit") {
				limit = splited[1];
			}
		}
		return ({ mongoCollection: mongoCollection, offset: offset, limit: limit });
	}else{
		return ({ mongoCollection: mongoCollection });
	}
}


function checkFodResult_Applications(requestInfo, body) {
	
	for (let iAux = 0; iAux < body.items.length; iAux++) {
		console.log("\t\t\tCheck if application already exits in ", requestInfo.mongoCollection, body.items[iAux]['applicationId'], "-", body.items[iAux]['applicationName'] );
		fodSrv.insertFoDEntity(body.items[iAux], requestInfo.mongoCollection, 'applicationId' ).then(
			function (mngResult) {
				var mngAppInsRes = mngResult;
				console.log("\t\t\t=> OK INSERT APP", mngAppInsRes.result.ok, ' ', mngAppInsRes.result.n, '  ', mngAppInsRes.ops[0].applicationId, "-", mngAppInsRes.ops[0]._id );
			}, function (err) {
				console.log("\t\t\tcheckFodResult_Applications  ", err);
			}
		);
	}
}

function checkFodResult_Releases(requestInfo, body) {
	
	for (let iAux = 0; iAux < body.items.length; iAux++) {
		console.log("\t\t\tCheck if releasse already exits  in ", requestInfo.mongoCollection, body.items[iAux]['releaseId'], "-", body.items[iAux]['releaseName'] );
		fodSrv.insertFoDEntity(body.items[iAux], requestInfo.mongoCollection, 'releaseId' ).then(
			function (mngResult) {
				var mngRelInsRes = mngResult;
				console.log("\t\t\t=> OK INSERT REL", mngRelInsRes.result.ok, ' ', mngRelInsRes.result.n, '  ', mngRelInsRes.ops[0].releaseId, "-", mngRelInsRes.ops[0]._id );
			}, function (err) {
				console.log("\t\t\tcheckFodResult_Releases  ", err);
			}
		);
	}
}

function checkFodResult_Vulnerabilities(requestInfo, body) {
	
	for (let iAux = 0; iAux < body.items.length; iAux++) {
		console.log("\t\t\tCheck if vulnerability already exits  in", requestInfo.mongoCollection, body.items[iAux]['vulnId'] );
		fodSrv.insertFoDEntity(body.items[iAux], requestInfo.mongoCollection, 'vulnId' ).then(
			function (mngResult) {
				var mngRelInsRes = mngResult;
				console.log("\t\t\t=> OK INSERT VUL", mngRelInsRes.result.ok, ' ', mngRelInsRes.result.n, '  ', mngRelInsRes.ops[0].vulnId, "-", mngRelInsRes.ops[0]._id );
			}, function (err) {
				console.log("\t\t\tcheckFodResult_Vulnerabilities  ", err);
			}
		);
	}
}

function checkFodResult_VulnerabilityAllData(requestInfo, body) {
	
	
	console.log("\t\t\tCheck if vulnerability ALL-DATA already exits  in", requestInfo.mongoCollection, body['vulnId'], body );
	fodSrv.insertFoDEntity(body, requestInfo.mongoCollection, 'vulnId' ).then(
		function (mngResult) {
			var mngRelInsRes = mngResult;
			console.log("\t\t\t=> OK INSERT VUL ALL-DATA", mngRelInsRes.result.ok, ' ', mngRelInsRes.result.n, '  ', mngRelInsRes.ops[0].vulnId, "-", mngRelInsRes.ops[0]._id );
		}, function (err) {
			console.log("\t\t\tcheckFodResult_Vulnerabilities  ", err);
		}
	);
	
}




function checkFodResult(requestInfo, body) {
	try {
        body= JSON.parse(body);
    } catch (e) {
        return false;
	}
	if (requestInfo.mongoCollection == "fod_vuls_comp") {
		body.totalCount = 1;
	}

	


	if(!body.totalCount ){
		console.log('\tERROR: checkFodResult: no body.totalCount.',  );
		return;
	}
	console.log('\t\t=========================BEGIN ASYNC' );
	console.log('\t\tQUERY FOD: ');
	console.log('\t\t\tEntity/Collection: ', requestInfo.mongoCollection);
	console.log('\t\t\toffset: ', requestInfo.offset);
	console.log('\t\t\tlimit: ', requestInfo.limit);
	console.log('\t\t\tTOTAL_COUNT: ', body.totalCount);
	if (requestInfo.mongoCollection == "fod_apps") {
		checkFodResult_Applications(requestInfo, body);
	}else if (requestInfo.mongoCollection == "fod_rels") {
		checkFodResult_Releases(requestInfo, body);
	}else if (requestInfo.mongoCollection == "fod_vuls") {
		checkFodResult_Vulnerabilities(requestInfo, body);
	}else if (requestInfo.mongoCollection == "fod_vuls_comp") {
		//Not the same response type than other requests, there is no totalCount and items atributes
		checkFodResult_VulnerabilityAllData(requestInfo, body);
	}
	console.log('\t\t=========================END SYNC. ASYNC RESULT:');
}


//Bypass request from client to kiuwan, no service call!!!!!!
//Save data in mongo,  as cache. 
function newRequest(req, res) {
	var data = req.body;
	console.log("\tRequest for FoD, input data=" + JSON.stringify(data, null, 8) );
	
	/*
	@TODO @WORKING  
	
	If useLocalCredentialsToFoD, we must get FoD token before call FoD API. 
	This is not an easy task and must be implemented with a concisious design
	While this functionlity is being implemented, we stil use token received in query header and pass it 


	// Remove  web client authorization header and insert new one with JWT token
	
	/*if (config.useLocalCredentialsToFoD) {
		requestData.headers['Authorization']= 'Basic ' +  Buffer.from(req.user.kiuwanUN + ':' + req.user.kiuwanPW).toString('base64');
		console.log("\tUsing Kiuwan credentials included in JWT token: ", requestData.headers['Authorization'] );
	}else{
		console.log("\tUsing Kiuwan credentials included in request data (json), not JWT credentials: ", data.headers['Authorization'] );
	}*/


	var requestInfo = parseFoDQueryString(data.headers['fodcol'], data.url);
	if( !requestInfo){
		res.status(400).send('Request to Kiuwan error: invalid query string');
		console.error("---------------------------------------------------------------------->Request to Kiuwan error: invalid query string");
	}else{
		console.log("---------------------------------------------------------------------->: valid query string");
	}

	var requestData = {
		agent: agent, // for proxy configuration View SASTWebApp server.js
		url: config.FoDApiUrl + data.url,
		timeout: 15000,
		method: data.method,
		json: data.body,
		headers: {
			'Authorization': data.headers['Authorization'],
			'Accept': data.headers['Accept'],//'application/json;'
		}
	};


	// Remove proxy agent if not needed
	if (!config.useProxy) {
		delete requestData.agent;
	}
	// Remove data if method is not POST
	if (data.method != 'POST' ) {
		delete requestData.json;
	}
	console.log("\tFoD Req=", requestData.url, " method : ", requestData.method  );

		const https = require('https');

		const options = {
			hostname: config.FoDApiHost,
			port: 443,
			path:  config.FoDApiAPrePath + data.url,
			method: data.method,
			headers: {
				'Authorization': data.headers['Authorization'],
				'Accept': data.headers['Accept'],//'application/json;'
			}
		};

		var stringBuffer = new String();

		const reqA = https.request(
			options, 
			(response) => {
				//console.log('statusCode:', response.statusCode);
				//console.log('headers:', response.headers);
				response.setEncoding('utf8');
				if(response.statusCode == 200 ){
					response.on('data', (d) => {
						//console.log("--------------------------------------------------->DATA", d);
						stringBuffer += d;
						//res.send(d);
					});

					response.on('end', () => {
						//console.log("--------------------------------------------------->END Loading Request", stringBuffer );

						try{
							checkFodResult(requestInfo, stringBuffer);
						}catch(err){
							console.log("\tExcepcion en checkFodResult" , err.message );	
						}
						res.send(stringBuffer);
					});
				}
				
			}
		);
		  
		reqA.on('error', (e) => {
			console.error(e);
		});
		
		
		reqA.end();







		/*request(
			requestData,
			(error, response, body) => {
				if (error) {
					console.log('error: ', error);
					res.status(400).send('Request to FoD error:' + error);
				}
				if(response.statusCode == 200){
					console.log("\tOK <- FoD Req : " , body );
					try{
						checkFodResult(requestInfo, body);
					}catch(err){
						console.log("\tExcepcion en checkFodResult" , err );	
					}
					
				}else{
					console.log("\tKO <- FoD Req : ststusCode=" , response.statusCode );
				}
				
				
			}
		).on('response',
			function(response) { 
				console.log("\tOK <- response!!!!!!!");
			}
		).on('data', 
			function(data) { 
				console.log("\tOK <- data!!!!!!!", data);
			}
		).on('error', 
			function(err) { 
				console.log("\tKO <- Error en la Request!!!!!!!", err);
			}
		).pipe(res);*/
		


}

/*
function getKiuwanStatistics(req, res) {
	var aggregatorField = req.query.agg;
	console.log('paramtetro controller-------------->', );
	kiuSrv.getKiuwanStatistics(req.query.agg)
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
*/

