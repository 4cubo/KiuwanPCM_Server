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
service.inFoDApp = inFoDApp;
module.exports = service;



async function inFoDApp(FoDApp) {
    var db = mongo.db(config.connectionString, { native_parser: true });
    db.bind('fOD_apps');

    var deferred = Q.defer();

    // validation
    db.fOD_apps.findOne(
        { name: FoDApp.name },
        function (err, app) {
            if ( err ) {
                deferred.reject(err.name + ': ' + err.message);
                db.close();
            }
            if (app) {
                // app already exists in  mongo
                deferred.reject(' FoD application "' + FoDApp.name + '" is already in DB');
                db.close();
            } else {
                insertFoDApp(FoDApp);
            }
        });

    function insertFoDApp(FoDApp) {
        mongoSanitize.sanitize(FoDApp, {
            replaceWith: '_'
          });
        db.fOD_apps.insert(
            FoDApp,
            function (err, doc) {
                if (err) deferred.reject(err.name + ': ' + err.message);
                deferred.resolve();
                db.close();
            });
    }
    return deferred.promise;
}
