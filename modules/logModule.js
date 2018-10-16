/**
 * Created by megan on 2016-11-04.
 */

var winston = require('winston');
require('winston-daily-rotate-file');
var fs = require('fs');
var moment = require('moment');
var cluster = require('cluster');
var config = require('./configModule');
var date = require('./dateModule');

var LogModule = function(){
    this._logDir = config.conf.log.dir || '/dev/shm/';
    if(!fs.existsSync(this._logDir)){
        fs.mkdirSync(this._logDir);
    }
    this._logDir += config.conf.appName;
    if(!fs.existsSync(this._logDir)){
        fs.mkdirSync(this._logDir);
    }

    var seoulZone = date.getTimeDifference() + 9;

    var customLog = {
        levels: {
            emerg: 0,
            alert: 1,
            crit: 2,
            error: 3,
            warn: 4,
            notice: 5,
            info: 6,
            debug: 7
        },
        colors: {
            emerg: 'red',
            alert: 'yellow',
            crit: 'red',
            error: 'red',
            warn: 'red',
            notice: 'yellow',
            info: 'green',
            debug: 'blue'
        }
    };

    this._logger = new (winston.Logger)({
        levels: customLog.levels,
        colors: customLog.colors,
        timestamp: true,
        transports: [
            // Console transport
            new (winston.transports.Console)({
                level: config.conf.log.consoleLevel || 'warn',
                colorize: true,
                timestamp: function() { return date.getBarDatetimeMsFormat_24(date.getDatetime() + seoulZone); }
            }),
            new winston.transports.DailyRotateFile({
                level: 'alert',
                colorize: true,
                timestamp: function() { return date.getBarDatetimeMsFormat_24(date.getDatetime() + seoulZone); },
                name: 'alert-file',
                filename: this._logDir + '/alert.',
                datePattern: date.getDateFormat_24(date.getDatetime() + seoulZone) + '.log',
                maxFiles: 2,
                json: false
            }),
            new winston.transports.DailyRotateFile({
                level: 'error',
                colorize: true,
                timestamp: function() { return date.getBarDatetimeMsFormat_24(date.getDatetime() + seoulZone); },
                name: 'error-file',
                filename: this._logDir + '/error.',
                datePattern: date.getDateFormat_24(date.getDatetime() + seoulZone) + '.log',
                maxFiles: 2,
                json: false
            }),
            new winston.transports.DailyRotateFile({
                level: 'info',
                colorize: true,
                timestamp: function() { return date.getBarDatetimeMsFormat_24(date.getDatetime() + seoulZone); },
                name: 'info-file',
                filename: this._logDir + '/info.',
                datePattern: date.getDateFormat_24(date.getDatetime() + seoulZone) + '.log',
                maxFiles: 2,
                json: false
            }),
            new winston.transports.DailyRotateFile({
                level: 'debug',
                colorize: true,
                timestamp: function() { return date.getBarDatetimeMsFormat_24(date.getDatetime() + seoulZone); },
                name: 'debug-file',
                filename: this._logDir + '/debug.',
                datePattern: date.getDateFormat_24(date.getDatetime() + seoulZone) + '.log',
                maxFiles: 2,
                json: false
            })
        ]
        // ,
        // exceptionHandlers: [
        //     // Console transport
        //     new (winston.transports.Console)(),
        //
        //     // new winston.transports.File({
        //     new winston.transports.DailyRotateFile({
        //         filename: logDir + '_exceptions.log.',
        //         datePattern: 'yyyyMMdd',
        //         maxFiles: 2
        //     })
        // ]
    });

    if(!(config.conf.log.fileAlert || false))
        this._logger.remove('alert-file');

    if(!(config.conf.log.fileError || true))
        this._logger.remove('error-file');

    if(!(config.conf.log.fileInfo || false))
        this._logger.remove('info-file');

    if(!(config.conf.log.fileDebug || false))
        this._logger.remove('debug-file');
};

LogModule.prototype.debug = function(){
    this._logger.debug.apply(this._logger, Array.prototype.slice.call(arguments));
};

LogModule.prototype.info = function(){
    if (!cluster.isMaster) {
        var args = Array.prototype.slice.call(arguments);
        args.unshift("cluster:" + process.pid);
        this._logger.info.apply(this._logger, args);
    }
};

LogModule.prototype.notice = function(){
    this._logger.notice.apply(this._logger, Array.prototype.slice.call(arguments));
};

LogModule.prototype.warn = function(){
    if (!cluster.isMaster) {
        var args = Array.prototype.slice.call(arguments);
        args.unshift("cluster:" + process.pid);
        this._logger.warn.apply(this._logger, args);
    }
};

LogModule.prototype.error = function(){
    this._logger.error.apply(this._logger, Array.prototype.slice.call(arguments));
};

LogModule.prototype.crit = function(){
    this._logger.crit.apply(this._logger, Array.prototype.slice.call(arguments));
};

LogModule.prototype.alert = function(){
    this._logger.alert.apply(this._logger, Array.prototype.slice.call(arguments));
};

LogModule.prototype.emerg = function(){
    this._logger.emerg.apply(this._logger, Array.prototype.slice.call(arguments));
};

module.exports = new LogModule();