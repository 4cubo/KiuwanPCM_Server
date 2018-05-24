var config = require('config.json');
var request = require('request');
var requestpromise = require('request-promise');
var Q = require('q');
var mongo = require('mongoskin');
var mongoSanitize = require('express-mongo-sanitize');
//var sleep = require('sleep');
// For proxy agent
var HttpsProxyAgent = require('https-proxy-agent');

var service = {};
service.getAll = getAll;
service.getStatus = getStatus;
service.getKiuwanStatistics = getKiuwanStatistics;

service.load = load;
//service.insertMany = insertMany;
// @aaa @TODO traer de paseFile.service.js
// service.create = create;


module.exports = service;


function getKiuwanStatistics( agregatorField ) {

    console.log ('paramtetro service-------------->', agregatorField );
    //var agregatorField = "$applicationPortfolios.Business Area";

    var db = mongo.db(config.connectionString, { native_parser: true });
    db.bind('kiuwan_apps');
    var result = {};
    var deferred = Q.defer();

    db.kiuwan_apps.aggregate(
        [ 
            {
                "$match": {
                    "applicationProvider":
                        { "$exists": true, "$ne": null  },
                    "name" : 
                        { $not :/.*_K4D_.*/i},
                    "name" :  /.*-.*/i ,
                    "applicationPortfolios.Aplicacion":
                        { "$exists": true, "$ne": null  },
                    "applicationPortfolios.Cliente":
                        { "$exists": true, "$ne": null  },                
                    "applicationPortfolios.Proyecto":
                        { "$exists": true, "$ne": null  },                                  
                    "applicationPortfolios.Tecnologia":
                        { "$exists": true, "$ne": null  },
                    "applicationPortfolios.Functional Community" :  
                        { $exists: true, $ne: null  } ,
                    "applicationPortfolios.Business Area" :  
                        { $exists: true, $ne: null  } , 
        
                }
            },

            
            { 
                "$group" : {
                    "_id": { 
                            $toUpper: agregatorField
                    }, 
                    count:{$sum:1} , 
                    total:{$sum:2} , 
                    apps: { $push: "$name" },
                    projects : { $push: "$applicationPortfolios.Proyecto" },
                    //tecnologia : {  $push: "$applicationPortfolios.Tecnologia" },
                    //tecnologia : {  $push: "$applicationPortfolios.Tecnologia" },
                }
            } 
        ],   
        function (err, apps) {
            if (err) deferred.reject(err.name + ': ' + err.message);
            result['_BA_'] = apps;
            console.log('------------------------>AGREGATE = ', result);
            deferred.resolve(result['_BA_']);
            
        }
    );

  
    


    return deferred.promise;
}

function getAll() {
    var db = mongo.db(config.connectionString, { native_parser: true });
    db.bind('kiuwan_apps');

    var deferred = Q.defer();

    db.kiuwan_apps.find().toArray(function (err, apps) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        // return apps 
        apps = _.map(apps, function (app) {
            return _.omit(app, '_id');
        });

        deferred.resolve(apps);
    });
    
    return deferred.promise;
}

async function insertKiuwanApplication(kiuApp) {
    var db = mongo.db(config.connectionString, { native_parser: true });
    db.bind('kiuwan_apps');

    var deferred = Q.defer();

    // validation
    db.kiuwan_apps.findOne(
        { name: kiuApp.name },
        function (err, app) {
            if (err) deferred.reject(err.name + ': ' + err.message);

            if (app) {
                // app already exists in  mongo
                deferred.reject(' Kiwan application "' + kiuApp.name + '" is already in DB');
            } else {
                insertKiuApp(kiuApp);
            }
        });

    function insertKiuApp(kiuApp) {
        mongoSanitize.sanitize(kiuApp, {
            replaceWith: '_'
          });
        db.kiuwan_apps.insert(
            kiuApp,
            function (err, doc) {
                if (err) deferred.reject(err.name + ': ' + err.message);
                deferred.resolve();
            });
    }

    return deferred.promise;
}

function getStatus(  ) {
    console.log("Kiuwan.Service.getStatus->");
    var db = mongo.db(config.connectionString, { native_parser: true });
    db.bind('kiuwan_status');


    var deferred = Q.defer();
    db.kiuwan_status.findOne( 
    	{ id: "current" }, 
    	function (err, currentStatus) {
	        if (err) deferred.reject(err.name + ': ' + err.message);
	
	        if (currentStatus) {
                console.log( "Kiuwan.Service.getStatus:", currentStatus );
                deferred.resolve(currentStatus);
	        } else {
	        	console.log( "Kiuwan.Service.getStatus: no conf in DB for current year. Initializing..." );
                resetStatus();
	        }
	    }
    );
    
    function resetStatus() {
        var newConf = {
            "id" : "current",
            "status" : "notloaded", 
            "startload" : new Date().toISOString(),
            "endload" : new Date().toISOString(),
            
         };
    	
        db.kiuwan_status.insert(
    		newConf,
            function (err, doc) {
                if (err) deferred.reject(err.name + ': ' + err.message);
                deferred.resolve(newConf);
            });
    }
    return deferred.promise;  
}

function updateStatusToLoading(  ) {
    var db = mongo.db(config.connectionString, { native_parser: true });
    db.bind('kiuwan_status');

    var deferred = Q.defer();

    db.kiuwan_status.updateOne( 
        { "id" : "current" }, 
        { $set : {status:'loading' , startload : new Date ().toISOString()} },
        function(err, result){
            
            if (result) { 
                console.log(' updateOne result = ' + result );
                db.close();
                deferred.resolve(result); 
            } else {
                console.log('Error=' + err );
                deferred.reject(err); 
            }
        }
    );

    return deferred.promise;

}

function load( kiuwanAuthToken ) {
    console.log("Kiuwan.Service.load->", kiuwanAuthToken );
    setTimeout(loadKiuwanApplicationsData, 1500, kiuwanAuthToken );
    return updateStatusToLoading(); 
}

var kiuwanAppData = {};

const  getAppsSync = async requestData => {  
    var result = await requestpromise(requestData)
        .then(function (parsedBody) {
            kiuwanAppData = JSON.parse(parsedBody);
            console.log ('#-->', kiuwanAppData.length  );
        })
        .catch(function (err) {
            console.log('---->error getting applications: ', err);
        }); 
    Promise.resolve(result);
};

async function loadKiuwanApplicationsData( token ) {
    console.log("---------------->loadKiuwanApplicationsData: " + token  );
    var agent = null;
    if (config.useProxy) {
        agent = new HttpsProxyAgent(config.proxyUrl);
    }
    // Request for get all Applications
    var requestData = {
		agent : agent, // for proxy configuration View SASTWebApp server.js
		url : config.kiuwanApiUrl + "/apps/list",
		method: 'GET',
		json : null,
		headers : {
			'Authorization' : token,
			'Accept' : 'application/json;',
			'Content-Type' : 'application/json; charset=UTF-8'
		}
	};
	// Remove proxy agent if not needed
	if (!config.useProxy) {
		delete requestData.agent;
	}
    console.log("Calling kiuwan for apps...", requestData.url,);
    await getAppsSync( requestData );
    console.log('Apps#: ', kiuwanAppData.length );
    loadKiuwanAnalysisAndDeliveries(token);   
}

const  getReportSync = async (requestData, appIndx, typeOfAnalysis) => {  
    var result = await requestpromise(requestData)
        .then(function (parsedBody) {
            kiuwanAppData[appIndx][typeOfAnalysis] = JSON.parse(parsedBody);
            //console.log ('#-->', kiuwanAppData[appIndx][typeOfAnalysis].length  );
        })
        .catch(function (err) {
            console.log('---->error getting [',typeOfAnalysis,']: ', err);
        }); 
    Promise.resolve(result);
};

const  getReportMetricsSync = async (requestData, appIndx, rIndex, typeOfAnalysis) => {  
    var result = await requestpromise(requestData)
        .then(function (parsedBody) {
            kiuwanAppData[appIndx][typeOfAnalysis][rIndex]['METRICS'] = JSON.parse(parsedBody);
            //kiuwanAppData[appIndx][typeOfAnalysis][rIndex]['METRICS'] = parsedBody;
            //console.log ('-->ok'  );
        })
        .catch(function (err) {
            console.log('---->error getting [',appIndx, typeOfAnalysis, rIndex,'] : ', err);
        }); 
    Promise.resolve(result);
};

async function loadKiuwanAnalysisAndDeliveries (  token ) {
    //console.log("---------------->loadKiuwanApplicationAnalysis: " + token  );
    var agent = null;
    if (config.useProxy) {
        agent = new HttpsProxyAgent(config.proxyUrl);
    }
    var requestData = {
        agent : agent, // for proxy configuration, view SASTWebApp server.js
        url : '',
        method: 'GET',
        json : null,
        headers : {
            'Authorization' : token,
            'Accept' : 'application/json;',
            'Content-Type' : 'application/json; charset=UTF-8'
        }
    };

    // Remove proxy agent if not needed
    if (!config.useProxy) {
        delete requestData.agent;
    }

    var appName = '';
    // Request for get all Application analysis
    for(var appIndex = 0; appIndex < kiuwanAppData.length; appIndex++){
        appName = kiuwanAppData[appIndex].name;
        console.log( "[",appIndex,"]Loading reports for " ,  kiuwanAppData[appIndex].name );
        //BASE LINES
        requestData.url = config.kiuwanApiUrl +  '/apps/'+encodeURI(appName)+'/analyses';
        console.log("Calling kiuwan for analysis...", requestData.url,);
        await getReportSync( requestData, appIndex, 'ANALISYS' );
        console.log('Analysis#: ', kiuwanAppData[appIndex]['ANALISYS'].length );

        //METRICS FOR BASE LINES
        for (var blIndex = 0; blIndex < kiuwanAppData[appIndex]['ANALISYS'].length; blIndex++){
            var aCode = encodeURI( kiuwanAppData[appIndex]['ANALISYS'][blIndex].code);
            requestData.url = config.kiuwanApiUrl +  '/metrics?code=' +  aCode;
            console.log("Calling kiuwan for analysis [",blIndex," ",aCode,"] metrics ...", requestData.url);
            await getReportMetricsSync( requestData, appIndex, blIndex, 'ANALISYS' );
            //console.log(' -->', kiuwanAppData[appIndex]['ANALISYS'][blIndex]['METRICS'] );
            //console.log(' -->ok' );
        }
        
        //DELIVERIES
        requestData.url = config.kiuwanApiUrl +  '/apps/'+encodeURI(appName)+'/deliveries';
        console.log("Calling kiuwan for deliveries...", requestData.url,);
        await getReportSync( requestData, appIndex, 'DELIVERIES' );
        console.log('Deliveries#: ', kiuwanAppData[appIndex]['DELIVERIES'].length );

        //METRICS FOR DELIVERIES
        for (var dlIndex = 0; dlIndex < kiuwanAppData[appIndex]['DELIVERIES'].length; dlIndex++){
            var dCode = encodeURI( kiuwanAppData[appIndex]['DELIVERIES'][dlIndex].code);
            requestData.url = config.kiuwanApiUrl +  '/metrics?code=' +  dCode;
            console.log("Calling kiuwan for deliverie [",dlIndex," ",dCode,"] metrics ...", requestData.url);
            await getReportMetricsSync( requestData, appIndex, dlIndex, 'DELIVERIES' );
            //console.log(' -->', kiuwanAppData[appIndex]['DELIVERIES'][dlIndex] );
            //console.log(' -->ok' );
        }
        
        console.log( "ok app " ,  kiuwanAppData[appIndex].name, ' inserting in Mongo...' );

        var inRes = await insertKiuwanApplication ( kiuwanAppData[appIndex] );

       
        
        console.log( 'ok', inRes );
    }
        
}