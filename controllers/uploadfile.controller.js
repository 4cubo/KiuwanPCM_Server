var config = require('config.json');
var express = require('express');
var router = express.Router();
var formidable = require('formidable');

//var Q = require('q');
var util = require('util');
var os = require('os');

//var userService = require('services/user.service');
var uploadFileService = require('services/uploadfile.service');
var parseFileService = require('services/parsefile.service');
// routes
//router.post('/authenticate', authenticate);
//router.post('/register', register);
//router.get('/', getAll);
//router.get('/current', getCurrent);
//router.put('/:_id', update);
//router.delete('/:_id', _delete);

router.post('/', uploadFile);
router.post('/saveRequest', saveRequest);

module.exports = router;

function uploadFile(req, res) {
	var form = new formidable.IncomingForm(),
		files = [],
		anyFile = false;

	form.uploadDir = os.tmpdir();

	form.on('file', function(field, file) {
			//console.log(field, file);
			//files.push([ field, file ]);
			files.push( file );
			anyFile = true;
		})
		.on('end', function() {
			if (anyFile){ 
			    //console.log("uploadfile.controller.uploadFile: Files OK" );
			    uploadFileService.uploadFile( files )
			        .then(function ( srd ) { // @aaa @TODO uploadFile debe devolver error y aqui tratarse!!!
			        	srd.fileConf.then(
							function(result) {
								srd.fileConf = result;
								console.log("	result=", srd );
								
								srd.fileIn = files;
								//srd.fileInfo = readExcel ();
								
								res.json( srd );
							}
			        	);
			            
			        })
			        .catch(function (err) {
			            res.status(400).send(err);
			        });
			}else{
				res.status(400).send("MingaDominga");
			}
		});
		form.parse(req);

}

function saveRequest( req, res ){
	
	console.log("saveRequest------------------------------------------" + JSON.stringify( req.body) );
	parseFileService.saveRequest( req.body.obj )
    .then(function ( saveRequestResult ) {
//    	srd.fileConf.then(
//			function(result) {
//				srd.fileConf = result;
//				console.log("	result=", srd );
//				
//				srd.fileIn = files;
//				//srd.fileInfo = readExcel ();
//				
//				res.json( srd );
//			}
//    	);
    	console.log("saveRequest result------------------------------------------" + JSON.stringify( saveRequestResult ) );
    	res.json( saveRequestResult );
    })
    .catch(function (err) {
        res.status(400).send(err);
    });
	
}


