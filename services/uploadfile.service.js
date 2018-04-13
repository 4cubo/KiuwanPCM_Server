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

    console.log("Service.uploadFile:");
   
    // for(var i=0;i<uFiles.length; i++){ 	/* @aaa TODO Multiple files */
	const oldPath = uFiles[0].path;
	const name= uFiles[0].name;
	// copy file to a temp folder
	let newpath="./UPLOADED_PROJECTS/TMP/"+name;
	console.log("   " + oldPath + "  " + name + "--->" + newpath );
	fs.rename(oldPath, newpath, function (err) {
        if (err) throw err;
    });
    // }	/* @aaa TODO Multiple files */
		
	let parsed = pFService.parseFile ( newpath );
	let fileConf = fNService.getProjectConf();
	//let graphData = pFService.graphData ( parsed, fileConf, name );
	
	srd = { file: name, fileConf: fileConf,  parsed : parsed /*, graphData : graphData*/ };
    deferred.resolve(srd);
    return deferred.promise;
}


function isOk( obj ){
	return ( typeof obj !== 'undefined'  &&  obj != null ) ;
}