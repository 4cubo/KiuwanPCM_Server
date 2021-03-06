﻿var util = require('util');
var config = require('config.json');
var Q = require('q');
var fs = require('fs');
var XLSX = require('xlsx');
var fNService = require('services/filename.service');

var mongo = require('mongoskin');
var db = mongo.db(config.connectionString, { native_parser: true });
db.bind('sastrequest');

var service = {};

service.parseFile = parseFile;
service.saveRequest = saveRequest;

module.exports = service;

// @aaa @TODO llevar a request.service.js
function saveRequest ( sastrequest ){

	var deferred = Q.defer();
	
	console.log("------->preparar objeto para inserción : ", sastrequest );
	// validation
	console.log(' SAST ID "' + sastrequest.curSASTId + '" -----> ');
	db.sastrequest.findOne(
    { curSASTId: sastrequest.curSASTId },
    function (err, result) {
        if (err) deferred.reject(err.name + ': ' + err.message);
        if ( result ) {
            // id already taken
        	console.log('SAST ID "' + sastrequest.curSASTId + '" is already taken');
            deferred.reject('SAST ID "' + sastrequest.curSASTId + '" is already taken');
        } else {
            createRequest();
        }
    });

	function createRequest() {
	    db.sastrequest.insert(
	    	sastrequest,
	        function (err, doc) {
	            if (err) deferred.reject( err.name + ': ' + err.message);
	            //let fileConf = fNService.getProjectConf();
	            console.log("------->devuelve: ", doc );
	            var result;
	            if( doc.result.ok  ){
	            	/* @aaa DO NOT CHANGE! Or change also SASTRequestSaveResponse in Angular Client. View  ClientRequestProviderService.saveRequest */
	            	result =  { result : 1, dbId : doc.insertedIds[0] , SASTId : doc.ops[0].curSASTId };
	            	console.log("------->devuelve 2: ", result );
	        	}else{
	        		deferred.reject( 'Error creating request' );
	        	}	
	            deferred.resolve( result );
	        });
	}
	
	return deferred.promise;
}

function parseFile(path) {
	console.log("Service.uploadFile:" + path);

	var result = {};
	var numberOfTec = 0;
	var numberOfSO = 0;
	var numberOfUsers = 0;
	try {
		var buf = fs.readFileSync(path);
		var wb = XLSX.read(buf, {
			type : 'buffer'
		});
		var sheet_name_list = wb.SheetNames;
		var sheet = wb.Sheets[sheet_name_list[0]];

		console.log("---->" + JSON.stringify(sheet_name_list));

		console.log("    Reading Sheet 0 Main Service Request");
		//Sheet 0 Main Service Request
		result.P_PROV = wb.Sheets[wb.SheetNames[0]]['D8'].v; //Proveedor 				

		result.PM_UID = "" + wb.Sheets[wb.SheetNames[0]]['D10'].v; //JP uid
		result.PM_EMA = "" + wb.Sheets[wb.SheetNames[0]]['D11'].v; //JP mail
		result.PM_FN = "" + wb.Sheets[wb.SheetNames[0]]['D12'].v; //JP FN
		result.PM_LN = "" + wb.Sheets[wb.SheetNames[0]]['D13'].v; //JP LN
		result.PM_BA = "" + wb.Sheets[wb.SheetNames[0]]['D14'].v; //JP Bussines Área
		result.PM_FC = "" + wb.Sheets[wb.SheetNames[0]]['D15'].v; //JP Functional Comunity

		result.P_APP = "" + wb.Sheets[wb.SheetNames[0]]['D17'].v; //Nombre Aplicación 	
		result.P_PRO = "" + wb.Sheets[wb.SheetNames[0]]['D18'].v; //Proyecto 									
		result.P_DES = "" + wb.Sheets[wb.SheetNames[0]]['D19'].v; //Descripción Proyecto 		
		result.P_CLI = "" + wb.Sheets[wb.SheetNames[0]]['D20'].v; //Cliente				
		// Validations
		result.PM_UID = result.PM_UID.toUpperCase();
		result.P_APP = result.P_APP.replace('/', '');
		result.P_PRO = result.P_PRO.replace('/', '');
		result.P_APP = result.P_APP.trim();
		result.P_PRO = result.P_PRO.trim();
		result.P_DES = result.P_DES.trim();
		result.P_PROV = result.P_PROV.trim();
		result.P_CLI = result.P_CLI.trim();
		console.log("---------> app=" + result.P_APP + "  pro=" + result.P_PRO + "<----------");
		result.P_T1 = isOk(wb.Sheets[wb.SheetNames[0]]['D22']) ? wb.Sheets[wb.SheetNames[0]]['D22'].v : null; //Tecnología 1
		result.P_T2 = isOk(wb.Sheets[wb.SheetNames[0]]['D23']) ? wb.Sheets[wb.SheetNames[0]]['D23'].v : null; //Tecnología 2
		result.P_T3 = isOk(wb.Sheets[wb.SheetNames[0]]['D24']) ? wb.Sheets[wb.SheetNames[0]]['D24'].v : null; //Tecnología 3
		if (isOk(result.P_T1)) {
			numberOfTec++
		}
		;
		if (isOk(result.P_T2)) {
			numberOfTec++
		}
		;
		if (isOk(result.P_T3)) {
			numberOfTec++
		}
		;
		console.log("     #Tec= " + numberOfTec);
		result.P_NUMTEC = numberOfTec;
		//Sheet 1 New OS Request
		console.log("    Reading Sheet 1  New OS Request");
		if (isOk(wb.Sheets[wb.SheetNames[1]]['D6'])) {

			numberOfSO = wb.Sheets[wb.SheetNames[1]]['D6'].v;
			if (numberOfSO == 0) {
				result.FACTORY_DATA = false;
			} else {
				result.soData = new Array(numberOfSO);
				result.FACTORY_DATA = true;
				console.log("     #OS " + numberOfSO + " is ok with #Tec?: " + (numberOfSO == numberOfTec));
				for (var i = 0; i < numberOfSO; i++) {
					result.soData[i] = {};
					result.soData[i].F_NAM = wb.Sheets[wb.SheetNames[1]]["D" + (4 * i + 8).toString()].v; //Factory Name
					result.soData[i].F_OSI = wb.Sheets[wb.SheetNames[1]]["D" + (4 * i + 9).toString()].v; //Factory OS_ID				
					result.soData[i].F_OST = wb.Sheets[wb.SheetNames[1]]["D" + (4 * i + 10).toString()].v; //Factory OS TECN	
					result.soData[i].F_NAM = result.soData[i].F_NAM.trim();
					result.soData[i].F_OSI = result.soData[i].F_OSI.trim();
					console.log("----->" + JSON.stringify(result));
				}
			}
		} else {
			result.FACTORY_DATA = false;
			result.soData = null;
		}

		//Sheet 2 New Lab User
		console.log("    Reading Sheet 2  New Lab User");
		if (isOk(wb.Sheets[wb.SheetNames[2]]['D6'])) {
			numberOfUsers = wb.Sheets[wb.SheetNames[2]]['D6'].v;
			if (numberOfUsers > 0) {
				result.LABUSER_DATA = true ;
				console.log("     ------------------------------------->#Lab Users= " + numberOfUsers);
				result.labUsersData = new Array(numberOfUsers);
				for (var i = 0; i < numberOfUsers; i++) {
					var cellIndex = "D" + (8 + i * 5).toString();
					console.log("      Block " + (i + 1) + " upper cell:" + cellIndex);
					result.labUsersData[i] = {};
					result.labUsersData[i].LAB_UID = wb.Sheets[wb.SheetNames[2]]["D" + (i * 5 + 8).toString()].v; //uid
					result.labUsersData[i].LAB_EMA = wb.Sheets[wb.SheetNames[2]]["D" + (i * 5 + 9).toString()].v; //mail
					result.labUsersData[i].LAB_UFN = wb.Sheets[wb.SheetNames[2]]["D" + (i * 5 + 10).toString()].v; //user first name 
					result.labUsersData[i].LAB_USN = wb.Sheets[wb.SheetNames[2]]["D" + (i * 5 + 11).toString()].v; //user last name 

					result.labUsersData[i].LAB_UID = result.labUsersData[i].LAB_UID.trim();
					result.labUsersData[i].LAB_UID = result.labUsersData[i].LAB_UID.toUpperCase();
					result.labUsersData[i].LAB_EMA = result.labUsersData[i].LAB_EMA.trim();
					result.labUsersData[i].LAB_UFN = result.labUsersData[i].LAB_UFN.trim();
					result.labUsersData[i].LAB_USN = result.labUsersData[i].LAB_USN.trim();
				}
			} else {
				result.LABUSER_DATA = false;
				result.labUsersDat = null;
			}
		} else {
			result.LABUSER_DATA = false;
			result.labUsersDat = null;
		}


	} catch (error) {
		result = null;
		console.log("    ERROR EN EXCEL:" + path);
		console.log("    ", JSON.stringify(error));
	}
	if ( result === null ) return;
	//Expand application names, factories, OSs etc...
		console.log('     Expanding app names...');
		expandAppName(result);
		console.log('     Expanding factory & OS names...');
		expandFactoryAndOS(result);
		console.log('     Expanding technologies names');
		expandTechnologies(result);
		console.log('     Resolving....', result );
	return result;
}

function expandAppName(result) { /* Steep 4 if(!SastServManager.CKC) this.createPortfolioInKiuwan ( SastServManager.ProviderPortfolioName, [ this.currentProjectInfo["P_PROV"] ] ); */
	if(!result.P_NUMTEC) return;
	let values= new Array(result.P_NUMTEC);
	let values2= new Array(result.P_NUMTEC);
	for (let i = 0; i < result.P_NUMTEC; i++) {
		let clave = 'P_T' + (i + 1);
		let curAppName = result.P_APP + '-' + result[clave];
		let curAppName2 = result.P_DES + '-' + result[clave];
		console.log('           Valor(' + (i + 1) + ')=' + clave + ' v=' + curAppName);
		values[i] = curAppName;
		values2[i] = curAppName2;
	}
	result.__subAppNameList = values;
	result.__subAppNameList2 = values2;
}

function expandFactoryAndOS(result) {
	result.__factoriesNameList = new Array();
	result.__osList = new Array();
	let strAux;
	if (!result.FACTORY_DATA) return;
	for (let ic = 0; ic < result.soData.length; ic++) {
		strAux = result.soData[ic].F_NAM;
		if (result.__factoriesNameList.indexOf(strAux) == -1) result.__factoriesNameList.push(strAux);

		strAux = result.soData[ic].F_OSI;
		if (result.__osList.indexOf(strAux) == -1) result.__osList.push(strAux);
	}
}

function expandTechnologies(result) {
	let clave,
		curTec;
	result.__techList = new Array();
	for (let ic = 0; ic < result.P_NUMTEC; ic++) {
		clave = "P_T" + (ic + 1);
		curTec = result[clave];
		result.__techList.push(curTec);
	}
}

function isOk(obj) {
	return (typeof obj !== 'undefined' && obj != null);
}

const SastServManager_ProjectPortfolioName = 'Proyecto';
const SastServManager_ClientPortfolioName = 'Cliente';
const SastServManager_ProviderPortfolioName = 'Provider';
const SastServManager_AppPortfolioName = 'Aplicacion';
const SastServManager_MatrixAppPortfolioName = 'Main Projet';
const SastServManager_TecPortfolioName = 'Tecnologia';
const SastServManager_FactoryPortfolioName = 'Factory';
const SastServManager_OSPortfolioName = 'OS';
const SastServManager_BussAreaPortfolioName = 'Business Area';
const SastServManager_FuncComPortfolioName = 'Functional Community';
const SastServManager_AppNamePortfolioName = 'Aplicacion';