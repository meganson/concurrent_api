/**
 * Created by megan on 2017-01-12.
 */

var debuggingController = require('../controllers/debuggingController');

// permission data
exports.getp = function(req, res){
    debuggingController.getP(req, res, function(rows){
        res.send(rows);
    });
};

// bookmark data
exports.getb = function(req, res){
    debuggingController.getB(req, res, function(rows){
        res.send(rows);
    });
};