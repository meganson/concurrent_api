/**
 * Created by megan on 2016-11-08.
 */

var ConsistentHashing = require('consistent-hashing');
var log = require('./logModule');

var ConsistentModule = function(){
};

ConsistentModule.prototype.init = function(nodes, callback){
    this._cons = new ConsistentHashing(nodes);
    log.info('consistent init', this._cons);
    callback();
};

ConsistentModule.prototype.getNode = function(key, callback){
    var node = this._cons.getNode(key);
    // log.info('getNode', key);
    if(node == '0') return callback(true, node);
    callback(false, node);
};

ConsistentModule.prototype.addNode = function(node){
    log.info('add node', node);
    this._cons.addNode(node);
};

ConsistentModule.prototype.removeNode = function(node){
    log.info('remove node', node);
    this._cons.removeNode(node);
};

module.exports = new ConsistentModule();