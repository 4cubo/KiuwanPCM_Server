var config = require('config.json');
var express = require('express');
var router = express.Router();
var requestService = require('services/request.service');

// routes
router.get('/', getAllRequest );
router.get('/:_id', getRequest );

module.exports = router;

function getAllRequest(req, res) {
	requestService.getAll()
        .then(function (sastRequests) {
            res.send(sastRequests);
        })
        .catch(function (err) {
            res.status(400).send(err);
        });
}
function getRequest(req, res) {
	requestService.getById(req.user.sub)
        .then(function (sastRequest) {
            res.send(sastRequest);
        })
        .catch(function (err) {
            res.status(400).send(err);
        });
}
