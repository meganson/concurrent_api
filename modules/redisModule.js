/**
 * Created by megan on 2016-11-07.
 */

var config = require('./configModule');
var redis = require('redis');
var log = require('./logModule');
var consistent = require('./consistentModule');

var RedisModule = function(){
};

RedisModule.prototype.init = function(callback){
    var self = this;
    var redisConf = config.conf.redis;
    this._client = [];

    redisConf.forEach(function(e, idx, arr){
        self.getClient(e.namespace, function(client){
            if(!client){
                self.connection(e, function(namespace, conn) {
                    log.info('connection redis');
                    self._client.push({namespace: namespace, conn: conn});
                    if(idx == arr.length - 1) callback();
                });
            }
        });
    });
};

RedisModule.prototype.getClient = function(namespace, callback){
    var conn;
    this._client.forEach(function(e, idx, arr){
        Object.keys(e).forEach(function(key, idx, arr){
            var value = e[key];
            if(key == 'namespace' && value == namespace){
                conn = e.conn;
            }
        });
    });
    callback(conn);
};

// DB(현재는 config) 에서 redis server list 받아온 후 최초 연결 및 consistenthasing 구성
// 주기적으로 연결 체크 하여 연결에 문제가 발생하면 removeNode 로 리스트에서 뺌
// 연결에 문제가 없는데 리스트에 없으면(getNodePosition) 집어넣음 addNode
RedisModule.prototype.connection = function(cfg, callback){
    var conn = redis.createClient(cfg.port, cfg.hostname, {});
    conn.on('connect', function () {
        conn.select(cfg.database, function(err){
            if(!err){
                consistent.addNode(cfg.namespace);
                callback(cfg.namespace, conn);
            }
        });
        log.info('Redis connect', cfg.namespace);
        // callback(conn)
    }).on('ready', function () {
        // console.log('Redis ready', cfg.namespace);
    }).on('error', function (err) {
        // You should assume here that the connection is lost, or compromised.
        log.warn('Redis error', err.code);
        consistent.removeNode(cfg.namespace);
        //...
    }).on('end', function (e) {
        log.warn('end redis');
        consistent.removeNode(cfg.namespace);
    });
};

RedisModule.prototype.set = function(namespace, key, val){
    this.getClient(namespace, function(client){
        client.set(key, val, function(err, value){
            (err) ? log.error(err) : log.debug('value from redis set is:', key, val, value);
        });
    });
};

RedisModule.prototype.get = function(namespace, key, callback){
    this.getClient(namespace, function(client){
        client.get(key, function (err, value) {
            (err) ? log.error(err) : log.debug('value from redis get is:', key, value);
            if (typeof callback !== 'undefined')
                callback(err, value);
            else
                return value;
        });
    });
};

RedisModule.prototype.setex = function(namespace, key, val, ttl){
    this.getClient(namespace, function(client){
        client.setex(key, ttl, val, function (err, value) {
            (err) ? log.error(err) : log.debug('value from redis setex is:', key, ttl, val, value);
        });
    });
};

RedisModule.prototype.hset = function(namespace, key, field, val){
    this.getClient(namespace, function(client){
        client.hset(key, field, val, function (err, value) {
            (err) ? log.error(err) : log.debug('value from redis hset is:', key, field, val, value);
        });
    });
};

RedisModule.prototype.hget = function(namespace, key, field, callback){
    this.getClient(namespace, function(client){
        client.hget(key, field, function(err, value){
            (err) ? log.error(err) : log.debug('value from redis hget is:', key, field, value);
            callback(value);
        });
        callback();
    })
};

RedisModule.prototype.hdel = function(namespace, key, field, callback){
    this.getClient(namespace, function(client){
        client.hdel(key, field, function(err, value){
            (err) ? log.error(err) : log.debug('value from redis hdel is:', key, field, value);
            callback(err);
        });
    });
};

RedisModule.prototype.hmset = function(namespace, key){
    console.error(arguments);   // todo : argument 처리
    this.getClient(namespace, function(client){
        client.hmset(key, arguments, function(err, value){
            (err) ? log.error(err) : log.debug('value from redis hmset is:', value);
        });
    });
};

RedisModule.prototype.sadd = function(namespace, key, val){
    this.getClient(namespace, function(client){
        client.sadd(key, val, function(err, value){
            (err) ? log.error(err) : log.debug('value from redis sadd is:', key, val, value);
        });
    });
};

RedisModule.prototype.smembers = function(namespace, key, callback){
    this.getClient(namespace, function(client){
        client.smembers(key, function(err, value){
            (err) ? log.error(err) : log.debug('value from redis smembers is:', key, value);
            callback(value);
        });
    });
};

RedisModule.prototype.srem = function(namespace, key, val, callback){
    this.getClient(namespace, function(client){
        client.srem(key, val, function(err, value){
            (err) ? log.error(err) : log.debug('value from redis srem is:', key, val, value);
            if (typeof callback !== 'undefined') callback(err);
        });
    });
};

RedisModule.prototype.del = function(namespace, key, callback){
    this.getClient(namespace, function(client){
        client.del(key, function(err, value){
            (err) ? log.error(err) : log.debug('value from redis del is:', key, value);
            callback(err);
        });
    });
};

RedisModule.prototype.expire = function(namespace, key, ttl){
    this.getClient(namespace, function(client){
        client.expire(key, ttl, function(err, value){
            (err) ? log.error(err) : log.debug('value from redis expire is:', key, ttl, value);
        });
    });
};

RedisModule.prototype.incr = function(namespace, key){
    this.getClient(namespace, function(client){
        client.incr(key, function(err, value){
            (err) ? log.error(err) : log.debug('value from redis incr is:', key, value);
        });
    });
};

RedisModule.prototype.decr = function(namespace, key){
    this.getClient(namespace, function(client){
        client.decr(key, function(err, value){
            (err) ? log.error(err) : log.debug('value from redis decr is:', key, value);
        });
    });
};

// RedisModule.prototype.scan = function(namespace, cursor, match, pattern, callback){
RedisModule.prototype.scan = function(){
    var params = Array.prototype.slice.call(arguments);
    var namespace = params.shift();
    var cursor = params.shift();
    var match = params.shift();
    var pattern = params.shift();
    var callback = params.shift();
    this.getClient(namespace, function(client){
        client.scan(cursor, match, pattern, function(err, value){
            (err) ? log.error(err) : log.debug('scan is:', value);
            callback(value);
        });
    });
};

RedisModule.prototype.hscan = function(namespace, key, cursor, callback){
    this.getClient(namespace, function(client){
        client.hscan(key, cursor, function(err, value){
            (err) ? log.error(err) : log.debug('scan is:', key, cursor, value);
            callback(value);
        });
    });
};

RedisModule.prototype.hkeys = function(namespace){
    this.getClient(namespace, function(client){
        client.hkeys("hash key", function (err, replies) {  // todo
            log.debug(replies.length + " replies:");
            replies.forEach(function (reply, i) {
                log.debug("    " + i + ": " + reply);
            });
            client.quit();
        });
    });
};

module.exports = new RedisModule();