var util = require('util');
var config = require('config.json');
// var _ = require('lodash');
// var jwt = require('jsonwebtoken');
// var bcrypt = require('bcryptjs');
var Q = require('q');
var fs = require('fs');
var fNService = require('services/filename.service');
var pFService = require('services/parsefile.service');
// var XLSX = require('xlsx');



var service = {};

service.uploadFile = uploadFile;


module.exports = service;

function uploadFile( uFiles ) {
	var srd={};
	var deferred = Q.defer();
	
	//deferred.resolve(srd); // By default?
	
    console.log("Service.uploadFile:");
   
    // for(var i=0;i<uFiles.length; i++){ 	/* @aaa TODO Multiple files */
	const oldPath = uFiles[0].path;
	const fileName= uFiles[0].name;
	//let modifiedFileName= (new Date().toISOString().trim() +  fileName).replace(/\s+/g, '-');; // It is trim necessary?
	// copy file to a temp folder
	let newpath="./UPLOADED_PROJECTS/TMP/"+fileName;
	console.log("   " + oldPath + "  " + fileName + "  " + "--->" + newpath );
	fs.rename(oldPath, newpath, function (err) {
        if (err) throw err;
    });
    // }	/* @aaa TODO Multiple files */
		
	var parsed = pFService.parseFile ( newpath );
	
	console.log ('Parsed=' + JSON.stringify(parsed));
	if(!isOk(parsed)){// Error parsing file
		console.log ('Rejecting......');
		deferred.reject('Error parsing Excel file');
	}else{
		// We (at the moment, @aaa :( ) include all parsed data from Excel file in response 
		for (var i in parsed){
			srd[i] = parsed[i];
			//console.log ('    ' + i + '='+ srd[i] + '  ' + parsed[i] );
		}
		srd['name'] = fileName;
		srd['size'] = uFiles[0].size;
		srd['registered'] = new Date().toLocaleDateString();
		srd['status'] = 1; // registered = 1, class SASTRequest
		srd['user'] = uFiles[0].size;
		
		console.log ('Getting SAST Id for request......');
		fNService.getProjectConf()
		.then(
			function( result ) { // @aaa @TODO Add error management?  It´s solved throwing error?
				srd['curSASTId'] = result.curSASTId;
				//console.log ( '  -------->' + srd.curSASTId );
				// Return result to controller
			    deferred.resolve(srd);
			}
    	);
		//let graphData = pFService.graphData ( parsed, fileConf, name ); //@aaa @TODO not working, currently tree node is expanded in browser
		//fileConf : fileConf, curSASTId: 'pending resolve'
	}
    return deferred.promise;
}


function isOk( obj ){
	return ( typeof obj !== 'undefined'  &&  obj != null ) ;
}