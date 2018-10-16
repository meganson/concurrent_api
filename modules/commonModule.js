/**
 * Created by megan on 2016-11-02.
 */

var log = require('./logModule');

var CommonModule = function(){};

CommonModule.prototype.validateParameters = function (params, callback){
    // find - only one
    log.debug(params);
    var self = this;
    var output = params.find(
        function(value){
            return self.isUndefined(value.value);
        }
    );
    callback(output);
};

CommonModule.prototype.filterParameters = function(params, callback){
    // filter - all of them
    log.debug(params);
    var self = this;
    var output = params.filter(
        function(value){
            return self.isNull(value.value)
        }
    );
    callback(output);
};

CommonModule.prototype.findArray = function(array, str, callback){
    var output = array.find(
        function(value){
            return value.value = str;
        }
    );
    callback(output);
};

CommonModule.prototype.isUndefined = function(str){
    if(typeof str === 'undefined' || str === null)
        return true;
    return false;
};

CommonModule.prototype.isBlank = function(str){
    if(str === '')
        return true;
    return false;
};

CommonModule.prototype.isNull = function (str){
    if(str === '' || typeof str === 'undefined' || str === null)
        return true;
    return false;
};

CommonModule.prototype.replaceBlank = function(str){
    return str.replace(/\s/g,"");
};

CommonModule.prototype.isJsonString = function (str){
    try {
        JSON.parse(str);
    } catch(e) {
        return false;
    }
    return true;
};

CommonModule.prototype.getParamErr = function (output){
    return {
        'result': 100,
        'param': output
    }
};

module.exports = new CommonModule();