/**
 * Created by megan on 2016-11-03.
 */

var path = require('path');
var fs = require('fs');

fs.readdirSync(__dirname).forEach(function (file) {
    if (file !== 'index.js') module.exports[path.basename(file, 'Module.js')] = require(path.join(__dirname, file));
});

var spDir = __dirname + '/../db/m_concurrent';
fs.readdirSync(spDir).forEach(function (file) {
    module.exports[path.basename(file, '.js')] = require(path.join(spDir, file));
});
