﻿var config = require('config.json');
var _ = require('lodash');
var Q = require('q');
var mongo = require('mongoskin');
var db = mongo.db(config.connectionString, { native_parser: true });
db.bind('filenameservice');


var service = {};

service.getProjectConf = getProjectConf;

module.exports = service;


function getCurrentQuarterOfYear( date ){
  var month = date.getMonth() + 1;
  return ("Q" + Math.ceil(month / 3));
}

function getYear2D( date ){
	  return (date.getFullYear() % 100).toString();
}

function getProjectConf(  ) {
   
    console.log("Service.getCurrentProjectName:");
    
    var currentQ = getCurrentQuarterOfYear( new Date() );
    var currentY2D = getYear2D( new Date() );
    var currentY = new Date().getFullYear();

    var deferred = Q.defer();
    db.filenameservice.findOne( 
    	{ year: currentY }, 
    	function (err, currentyearconf) {
	        if (err) deferred.reject(err.name + ': ' + err.message);
	
	        if (currentyearconf) {
	            // current yearconfig in DB exits
	        	console.log( "filenameservice.getCurrentProjectName:["+currentY2D+currentQ+"] conf=", currentyearconf );
	            deferred.resolve({
	                _id: currentyearconf._id,
	                year: currentyearconf.year,
	                q1: currentyearconf.q1,
	                q2: currentyearconf.q2,
	                q3: currentyearconf.q3,
	                q4: currentyearconf.q4,
	                curName: currentY2D+currentQ + padWithZeroes((currentyearconf[currentQ.toLowerCase()]+1).toString(), 5)
	            });
	        } else {
	            // current year configuration must be initialized in DB
	        	console.log( "filenameservice.getCurrentProjectName: no conf in DB for current year. Initializing..." );
	        	createConf();
	        }
	    }
    );
    
    function createConf() {
        // new Object
        var newConf = { "year" : currentY, "q1" : 1, "q2" : 1, "q3" : 1, "q4" : 1 }

        // add hashed password to user object
        user.hash = bcrypt.hashSync(userParam.password, 10);

        db.filenameservice.insert(
    		newConf,
            function (err, doc) {
                if (err) deferred.reject(err.name + ': ' + err.message);

                deferred.resolve(newConf);
            });
    }
    
    return deferred.promise;
   
}

function padWithZeroes(n, width) { 
	if (width <= 0) return n;
	while(n.length<width)n = '0' + n; 
	return n;
} 
