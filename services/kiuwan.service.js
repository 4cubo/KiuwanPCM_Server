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

    console.log ('\tgetKiuwanStatistics[SERVICE] grouped by element:', agregatorField  );
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
            //console.log('------------------------>AGREGATE = ', result);
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
            if ( err ) {
                deferred.reject(err.name + ': ' + err.message);
                db.close();
            }
            if (app) {
                // app already exists in  mongo
                deferred.reject(' Kiwan application "' + kiuApp.name + '" is already in DB');
                db.close();
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
                deferred.resolve(doc);
                db.close();
            });
    }
    return deferred.promise;
}

function getStatus(  ) {
    //console.log("\n\t->Kiuwan.Service.getStatus");
    var db = mongo.db(config.connectionString, { native_parser: true });
    db.bind('kiuwan_status');


    var deferred = Q.defer();
    db.kiuwan_status.findOne( 
    	{ id: "current" }, 
    	function (err, currentStatus) {
	        if (err) {
                deferred.reject(err.name + ': ' + err.message);
                db.close();
            }
	
	        if (currentStatus) {
                console.log( "\n\t->Kiuwan.Service.getStatus:" +  currentStatus.id + "  " +  currentStatus.status);
                deferred.resolve(currentStatus);
                db.close();
	        } else {
	        	console.log( "\n\t->Kiuwan.Service.getStatus:no conf in DB for current year. Initializing..." );
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
                db.close();
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
                console.log('\tKiuwan.Service.updateStatusToLoading result=' + result );
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
    console.log("\tKiuwan.Service.load->", kiuwanAuthToken );
    setTimeout(loadKiuwanApplicationsData, 1500, kiuwanAuthToken );
    return updateStatusToLoading(); 
}

var kiuwanAppData = {};

const  getAppsSync = async requestData => {
    console.log("\t->getAppsSync:Calling kiuwan for apps:", requestData.url,);  
    var result = await requestpromise(requestData)
        .then(function (parsedBody) {
            kiuwanAppData = JSON.parse(parsedBody);
            console.log ('\tok<- ', kiuwanAppData.length  );
        })
        .catch(function (err) {
            console.log('\terror<-', err);
        }); 
    Promise.resolve(result);
};

async function loadKiuwanApplicationsData( token ) {
    console.log("\tLoading kiuwan applications: " );
    var agent = null;
    if (config.useProxy) {
        agent = new HttpsProxyAgent(config.proxyUrl);
    }
    // Request for get all Applications   @TODO MUST BE PAGINATED
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
    try{
        await getAppsSync( requestData );
        console.log('\tNumber of received apps#: ', kiuwanAppData.length );
        loadKiuwanAnalysisAndDeliveries(token);
    }catch(error){
        console.log ('\tERROR<- getting apps in loadKiuwanApplicationsData', error );
    }
       
}

const  getReportSync = async (requestData, appIndx, typeOfAnalysis) => {  
    var result = await requestpromise(requestData)
        .then(function (parsedBody) {
            kiuwanAppData[appIndx][typeOfAnalysis] = JSON.parse(parsedBody);
            //console.log ('#-->', kiuwanAppData[appIndx][typeOfAnalysis].length  );
        })
        .catch(function (err) {
            console.log('---->error getting report [',typeOfAnalysis,']: ', err);
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
            console.log('---->error getting [',appIndx, typeOfAnalysis, rIndex,'] : ', err, typeof err);
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
        console.log( "\t-->[",(appIndex+1),"/",kiuwanAppData.length,"] " ,  kiuwanAppData[appIndex].name, ", loading reports "  );
        //BASE LINES
        requestData.url = config.kiuwanApiUrl +  '/apps/'+encodeURI(appName)+'/analyses';
        console.log("\t\tCalling kiuwan for analysis...", requestData.url,);
        try{
            await getReportSync( requestData, appIndex, 'ANALISYS' );
        }catch(error){
            console.log ('\t\tERROR<-', error );
        }
        console.log('\t\t\tAnalysis#: ', kiuwanAppData[appIndex]['ANALISYS'].length );

        //METRICS FOR BASE LINES
        for (var blIndex = 0; blIndex < kiuwanAppData[appIndex]['ANALISYS'].length; blIndex++){
            var aCode = encodeURI( kiuwanAppData[appIndex]['ANALISYS'][blIndex].code);
            requestData.url = config.kiuwanApiUrl +  '/metrics?code=' +  aCode;
            console.log("\t\tCalling kiuwan for metrics of analysis [",(blIndex+1),"/", kiuwanAppData[appIndex]['ANALISYS'].length , "-",aCode,"]...", requestData.url);
            try{
                await getReportMetricsSync( requestData, appIndex, blIndex, 'ANALISYS' );
            }catch(error){
                //console.log ('\t\tERROR<-', error );
            }
        }
        
        //DELIVERIES
        requestData.url = config.kiuwanApiUrl +  '/apps/'+encodeURI(appName)+'/deliveries';
        console.log("\t\tCalling kiuwan for deliveries...", requestData.url,);
        try{
            await getReportSync( requestData, appIndex, 'DELIVERIES' );
        }catch(error){
            console.log ('\t\tERROR<-', error );
        }
        console.log('\t\t\tDeliveries#: ', kiuwanAppData[appIndex]['DELIVERIES'].length );

        //METRICS FOR DELIVERIES
        for (var dlIndex = 0; dlIndex < kiuwanAppData[appIndex]['DELIVERIES'].length; dlIndex++){
            var dCode = encodeURI( kiuwanAppData[appIndex]['DELIVERIES'][dlIndex].code);
            requestData.url = config.kiuwanApiUrl +  '/metrics?code=' +  dCode;
            console.log("\t\tCalling kiuwan for metrics of delivery [",(dlIndex+1),"/", kiuwanAppData[appIndex]['DELIVERIES'].length,"-",dCode,"] metrics ...", requestData.url);
            try{
                await getReportMetricsSync( requestData, appIndex, dlIndex, 'DELIVERIES' );
            }catch(error){
                //console.log ('\t\tERROR<-', error );
            }
            //console.log(' -->', kiuwanAppData[appIndex]['DELIVERIES'][dlIndex] );
            //console.log(' -->ok' );
        }
        
        console.log( "\t\tok loading app data " ,  kiuwanAppData[appIndex].name, ', inserting in mongo...' );
        var inRes;
        try{
            inRes = await insertKiuwanApplication ( kiuwanAppData[appIndex] );
            console.log( '\t\tOK: ', inRes.ops[0]._id );
        }catch(error){
            console.log ('\t\tERROR: ', error );
        }
        
    }
    console.log("\tLOADING KIUWAN DATA PROCESS END"  );
        
}