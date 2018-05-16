var config = require('config.json');
//var _ = require('lodash');
//var jwt = require('jsonwebtoken');
//var bcrypt = require('bcryptjs');
var Q = require('q');
var mongo = require('mongoskin');
var db = mongo.db(config.connectionString, { native_parser: true });
db.bind('sastrequest');

var service = {};


service.getAll = getAll;
service.getById = getById;
//@aaa @TODO traer de  a paseFile.service.js
// service.create = create;


module.exports = service;

function getAll() {
    var deferred = Q.defer();

    db.sastrequest.find().toArray( function ( err, sastRequest ) {
        if (err) deferred.reject(err.name + ': ' + err.message);
        deferred.resolve( sastRequest );
    });

    return deferred.promise;
}

function getById(_id) {
    var deferred = Q.defer();

    db.sastrequest.findById(_id, function (err, sastRequest) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (sastRequest) {
            deferred.resolve(sastRequest);
        } else {
            // sastRequest not found
            deferred.resolve();
        }
    });

    return deferred.promise;
}

//@aaa @TODO traer de  a paseFile.service.js
//function create(userParam) {
//}
