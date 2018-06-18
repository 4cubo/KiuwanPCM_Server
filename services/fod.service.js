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
service.insertFoDEntity = insertFoDEntity;
module.exports = service;



function insertFoDEntity( FodEntity, collectionName, id_FieldName ) {
    var db = mongo.db(config.connectionString, { native_parser: true });
    db.bind(collectionName);

    var deferred = Q.defer();

    // validation
    console.log('\t\t\t\tinsertFoDEntity collectionName = ', collectionName, ", id_FieldName=", id_FieldName, ", value=", FodEntity[id_FieldName], ", FodEntity['id_FieldName']=", FodEntity[id_FieldName] /*,", FodEntity=",  FodEntity */ );
    //console.log('------->insertFoDEntity typeof FodEntity=', typeof FodEntity);
    var queryObj = {};
    queryObj[id_FieldName] =  FodEntity[id_FieldName] ;
    db[collectionName].findOne(
        //{ id_FieldName : FodEntity[id_FieldName]  },
        queryObj,
        function (err, data) {
            if ( err ) {
                deferred.reject( err.name + ': ' + err.message );
                db.close();
            }
            if (data) {
                // Entity already exist in  mongo
                deferred.reject(' FoD entity "' + FodEntity[id_FieldName] + '" already exist in DB  id=' + data[id_FieldName] );
                db.close();
            } else {
                insertEntity(FodEntity);
            }
        });

    function insertEntity(fodentity) {
        /*mongoSanitize.sanitize(FoDApp, {
            replaceWith: '_'
          });*/
        fodentity['__baseline'] = "VVASE_LINE"; 
        db[collectionName].insert(
            fodentity,
            function (err, doc) {
                if (err) deferred.reject(err.name + ': ' + err.message);
                deferred.resolve(doc);
                db.close();
            });
    }
    return deferred.promise;
}
