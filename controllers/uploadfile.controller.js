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
			    console.log("uploadfile.controller.uploadFile: Files OK" );
			    uploadFileService.uploadFile( files )
			    .then(function ( srd ) { // @aaa @TODO uploadFile debe devolver error y aqui tratarse!!!
		        	console.log("	result controller", srd );
					res.json( srd );
			     })
			     .catch(function (err) {
			            res.status(400).send(err);
			     });
			}else{
				res.status(400).send("MingaDominga");
			}
		}
	);
	
	// launch parse of the HTTP request
	form.parse(req);

}

function saveRequest( req, res ){
	
	parseFileService.saveRequest( req.body.obj )
    .then(function ( saveRequestResult ) {
    	console.log("saveRequest result------------------------------------------" + JSON.stringify( saveRequestResult ) );
    	res.json( saveRequestResult );
    })
    .catch(function (err) {
        res.status(400).send(err);
    });
	
}


