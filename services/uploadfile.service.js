var util = require('util');
var config = require('config.json');
var _ = require('lodash');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
var Q = require('q');
var fs = require('fs');
var fNService = require('services/filename.service');
var await = require('await')

var mongo = require('mongoskin');
var db = mongo.db(config.connectionString, { native_parser: true });
db.bind('users');


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
    // }									/* @aaa TODO Multiple files */
	srd = { file: name, fileConf: fNService.getProjectConf() };
    deferred.resolve(srd);
    return deferred.promise;
}



