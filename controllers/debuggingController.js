/**
 * Created by megan on 2017-01-12.
 */

var megan = require('modules');
var async = require('async');

module.exports = {
    getP: function(req, res, callback){
        var uno = req.query.uno;
        var group = req.query.group;
        var key = 'p:'+group+':'+uno;

        megan.consistent.getNode(uno, function(err, namespace) {
            if(!err){
                megan.redis.smembers(namespace, key, function(value){
                    megan.log.debug(namespace, value);
                    callback(value);
                });
            }
        });
    },
    getB: function(req, res, callback){
        var uno = req.query.uno;
        var group = req.query.group;
        var key = 'p:'+group+':'+uno;
        var bValue = [];

        megan.consistent.getNode(uno, function(err, namespace){
            if(!err) {
                megan.redis.smembers(namespace, key, function (value) {
                    async.each(value, function (e, cb) {
                        var pData = JSON.parse(e);
                        var key = 'b:' + group + ':' + uno + ':' + pData.playId;
                        megan.redis.get(namespace, key, function (err, val) {
                            if(!megan.common.isNull(val)) bValue.push(val);
                            cb(null);
                        });
                    }, function (err) {
                        if (err) return;
                        callback(bValue);
                    });
                });
            }
        });
    }
};
