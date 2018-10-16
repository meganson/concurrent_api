/**
 * Created by megan on 2016-11-24.
 */

process.env.NODE_PATH = __dirname;
require('module').Module._initPaths();

var cluster = require('cluster');
var log = require('./modules/logModule');

var config = require('./modules/configModule');
var redis = require('./modules/redisModule');
var consistent = require('./modules/consistentModule');

var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var concurrent = require('routes/concurrent');
var debugging = require('routes/debugging');

var numWorkers = (config.conf.processCnt) ? config.conf.processCnt : require('os').cpus().length;

// 필요 모듈 로딩 완료 후 web server start
consistent.init([], function(){
    redis.init(function(){
        startWeb();
    });
});

var resTimeout = function(req, res, next){
    res.setTimeout(2 * 1000, function(){
        log.warn('Response has timed out.');
        res.sendStatus(408);
    });
    next();
};

var errorHandler = function(err, req, res, next){
    if (res.headersSent) {
        return next(err)
    }
    res.status(500);
    res.render('error', { error: err })
};

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// app.use(resTimeout);
app.use(errorHandler);

// health check
app.get('/check.html', concurrent.healthCheck);
// 동시청 가능 여부
app.get('/v1/permission', concurrent.getPermission);
// 패스워드 변경 처리
app.delete('/v1/permission', concurrent.deletePermission);
// 동시청 유저
app.get('/v1/count', concurrent.getCoucurrentUser);
// 동시청 사용 여부 설정
app.get('/v1/use', concurrent.setUseOrNot);
// pooqzone 용 전날 최대 동시청 유저
app.get('/v1/max', concurrent.getMaxConcurrentUser);


// 요청 통계
concurrent.statistics();


// debugging 용 api
app.get('/getp', debugging.getp);
app.get('/getb', debugging.getb);


function startWeb(){
    cluster.schedulingPolicy = cluster.SCHED_RR;
    if (cluster.isMaster) {
        // 클러스터 워커 프로세스 포크
        log.notice('Master cluster setting up ' + numWorkers + ' workers...');

        for (var i = 0; i < numWorkers; i++) {
            cluster.fork();
        }

        cluster.on('online', function(worker) {
            log.notice('Worker ' + worker.process.pid + ' is online');
        });

        cluster.on('exit', function(worker, code, signal) {
            log.notice('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
            log.notice('Starting a new worker');
            cluster.fork();
        });
    } else {
        var server = app.listen(config.conf.port, function(){
            var host = server.address().address;
            var port = server.address().port;
            log.notice(process.pid, 'server listening on ', host, port);
        });
    }
}

process.on('uncaughtException', function(err) {
    log.error('uncaughtException :', err.message);
    process.exit(1);
});