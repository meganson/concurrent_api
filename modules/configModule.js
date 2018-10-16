/**
 * Created by megan on 2016-11-15.
 */

var path = require('path');
var fs = require('fs');

var confDir = __dirname + '/../conf';
var confName = 'default.json';

fs.readdirSync(confDir).forEach(function (file) {
    for(var i = 0; i < process.argv.slice(2).length; i+=2){
        if(process.argv.slice(2)[i] === '-c'){
            confName = process.argv.slice(2)[i+1] + '.json';
            if(file == confName){
                confName = file;
            }
        }
    }
});

module.exports['conf'] = require(path.join(confDir, confName));