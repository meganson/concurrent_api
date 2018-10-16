/**
 * Created by megan on 2016-11-24.
 */

var megan = require('modules');
var async = require('async');

// 후자 로그인 / 후자 패스워드 변경 (접속 허용)
// userId, cnt
// device, ip, pid

// 브라우저 변경 (25 초 이후 접속 처리. 조건별 처리 하지 않음)
// userId, cnt, ip
// device, pid

// 푹존
// userId, cnt
// device, ip, pid

var ttl = megan.config.conf.permissionTtlHours * 60 * 60;
var arrGroup = [0, 1, 2];

var permissionCnt = 0;
var deleteCnt = 0;
var concurrentUserCnt = 0;
var useCnt = 0;

module.exports = {
    // 접근 권한
    getPermission: function(req, res, callback){
        // req.query = {
        //     "group": 1,
        //     "uno": "2811301",
        //     "limit": 5,
        //     "guid": "142c74fc-783b-11e6-a219-067498002a25",      // device id (안드 설치시, ie 등 진입시 등)
        //     "ipAddress": "127.0.0.2",
        //     "playId": "01d5a682c30d4d01a7eeacc3318a8226.1",      // session id (새로고침, 화면변경, 일시정지 후 재생)
        //     "lastPlayId": "01d5a682c30d4d01a7eeacc3318a8226.6"
        // };
        var self = this;

        // debugging 을 위한 req 무조건 저장
        megan.log.debug(req.url);
        ++permissionCnt;

        // 동시청 사용 여부
        megan.consistent.getNode('1', function(err, namespace) {
            if(!err){
                megan.redis.get(namespace, 'use', function (err, boolean) {
                    if (megan.common.isNull(boolean) || boolean > 0) {
                        var params = megan.permissionModel.setParameter(req.query);
                        var uno = params.uno;
                        var group = params.group;
                        var guid = params.guid;
                        var playId = params.playId;
                        var ipAddress = params.ipAddress;

                        // pooq : 5957349, wifi : 5748288, pms : 4929284, my :
                        if((uno == '5957349') || (uno == '5748288') || (uno == '4929284')) megan.log.info(req.query);

                        if (megan.common.isNull(uno)) return callback({result: -1, desc: 'no parameters : uno'});
                        if (megan.common.isNull(group)) return callback({result: -1, desc: 'no parameters : group'});
                        if (megan.common.isNull(guid)) return callback({result: -1, desc: 'no parameters : guid'});
                        if (megan.common.isNull(playId)) return callback({result: -1, desc: 'no parameters : playId'});
                        if (megan.common.isNull(ipAddress)) return callback({result: -1, desc: 'no parameters : ipAddress'});

                        // var key = 'p:' + group + ':' + uno;
                        if (group > 0) {      // group : 0 이상일 시 동시청 제어
                            megan.consistent.getNode(uno, function (err, namespace) {
                                if(!err){
                                    megan.log.debug(uno, namespace);
                                    megan.redis.smembers(namespace, 'p:'+group+':'+uno, function (value) {
                                        var concurrentUsr = value.length;
                                        megan.log.debug('concurrentUser:', concurrentUsr, 'limit:', params.limit);
                                        // 최대 동시청 유저수 계산으로 인해 limit 체크하지 않음. 20170201 변경
                                        // if (concurrentUsr < params.limit) { // 현재 동시청 유저 수 계정 limit 미만, 세선 발급
                                        //     // limit 1 초과의 요청만 계산(pooqzone 가정)
                                        //     if(params.limit > 1) self.insertMaxConcurrentUser(namespace, uno, concurrentUsr);
                                        //
                                        //     self.insertPermission(namespace, key, self.getValue(params), function (result) {
                                        //         // self.insertBookmark(namespace, params);
                                        //         callback(result);
                                        //     });
                                        //     return;
                                        // }
                                        // 현재 동시청 유저 수 계정 limit 이상 (접속 허용 수 초과), 유효 하지 않은 세선 정리 후 접속 허용 여부 체크
                                        self.arrangeSession(namespace, params, value, concurrentUsr, function (result) {
                                            callback(result);
                                        });
                                    });
                                    return;
                                }
                                // 살아 있는 redis 없음. (접속 허용)
                                callback({result: 1});
                            });
                            return;
                        }
                        // 동시청 제어 대상 아님 (접속허용)
                        return callback({result: 1});
                    }
                    // 동시청 제어 안함 (접속허용)
                    callback({result: 1});
                });
                return;
            }
            // 살아 있는 redis 없음. (접속 허용)
            callback({result: 1});
        });
    },
    // 유저 데이터 삭제
    deletePermission: function(req, res, callback){
        var self = this;

        megan.log.debug(req.url);
        ++deleteCnt;

        var params = req.query;
        var uno = params.uno, group = params.group, playId = params.playId;

        if(megan.common.isNull(uno)) return callback({result: -1, desc: 'no parameters : uno'});

        megan.consistent.getNode(uno, function(err, namespace){
            if(!err){
                if(typeof group !== 'undefined' && typeof playId !== 'undefined'){
                    self.deleteSpecificSession(namespace, group, uno, playId, function (result) {
                        megan.log.debug('deletePermission', group, uno, playId);
                        callback(result);
                    });
                    return;
                }

                if(typeof group !== 'undefined') {
                    self.deleteGroupSession(namespace, group, uno, function(result){
                        megan.log.debug('deletePermission', group, uno);
                        callback(result);
                    });
                    return;
                }

                arrGroup.forEach(function(i){
                    self.deleteGroupSession(namespace, i, uno, function(result){
                        megan.log.debug('deletePermission', i, uno);
                    });
                });
                return callback({result: 1});
            }
            // 살아 있는 redis 없음
            callback({result: 1});
        });
    },
    // 동시청 유저
    getCoucurrentUser: function(req, res, callback){
        var self = this;

        megan.log.debug(req.url);
        ++concurrentUserCnt;

        var pData;
        var params = req.query;
        var uno = params.uno, group = params.group;
        var nowConcurrentCnt = 0;
        var arrRemainSession = [];
        var pKey;

        if(megan.common.isNull(uno)) return callback({result: -1, desc: 'no parameters : uno'});

        if(typeof group !== 'undefined') {
            megan.consistent.getNode(uno, function(err, namespace){
                if(!err){
                    megan.redis.smembers(namespace, 'p:'+group+':'+uno, function(value) {
                        async.each(value, function(e, cb){
                            pData = JSON.parse(e);
                            var bKey = 'b:'+group+':'+uno+':'+pData.playId;
                            megan.redis.get(namespace, bKey, function(err, bVal){
                                if(!megan.common.isNull(bVal)){
                                    ++nowConcurrentCnt;
                                    arrRemainSession.push(bVal);
                                }
                                cb(null);
                            });
                        }, function(err){
                            callback({result: 1, cnt: nowConcurrentCnt, playLists: arrRemainSession});
                        });
                        // 20170201 방식 변경
                        // self.deleteInvalidSession(namespace, group, params, value, function (err, cnt, remainSession) {
                        //     if (err) callback({result: 0});
                        //     callback({result: 1, cnt: cnt, playLists: remainSession});
                        // });
                    });
                    return;
                }
                // 살아 있는 redis 없음
                callback({result: 1});
            });

            return;
        }

        megan.consistent.getNode(uno, function(err, namespace) {
            if(!err){
                async.each(arrGroup, function(e, mcb){
                    pKey = 'p:'+e+':'+uno;
                    megan.redis.smembers(namespace, pKey, function (value) {
                        megan.log.debug('permission user :::::', pKey, value);
                        async.each(value, function(se, scb){
                            var pData = JSON.parse(se);
                            var bKey = 'b:' + e + ':' + uno + ':' + pData.playId;
                            megan.redis.get(namespace, bKey, function (err, bVal) {
                                megan.log.debug('bookmark value :::::', bVal, se);
                                if (!megan.common.isNull(bVal)) {
                                    var obj = {group: e};
                                    Object.assign(obj, JSON.parse(bVal));
                                    ++nowConcurrentCnt;
                                    arrRemainSession.push(obj);
                                }
                                scb();
                            });
                        }, function(err){
                            if(err){
                                megan.log.warn('fail to sub loop for get user');
                                mcb();
                            }else{
                                megan.log.debug('success to sub loop for get user', nowConcurrentCnt, arrRemainSession);
                                mcb();
                            }
                        });

                        // 20170201 방식 변경
                        // megan.log.debug('permission user :::::', pKey, value);
                        // nowConcurrentCnt += value.length;
                        // async.each(value, function(se, scb){
                        //     var pData = JSON.parse(se);
                        //     var bKey = 'b:' + e + ':' + uno + ':' + pData.playId;
                        //     megan.redis.get(namespace, bKey, function (err, bVal) {
                        //         megan.log.debug('bookmark value :::::', bVal, se);
                        //         if (megan.common.isNull(bVal)) {
                        //             megan.redis.srem(namespace, 'p:' + e + ':' + uno, se);
                        //             nowConcurrentCnt--;
                        //             scb();
                        //         } else {
                        //             var obj = {group: e};
                        //             Object.assign(obj, JSON.parse(bVal));
                        //             arrRemainSession.push(obj);
                        //             scb();
                        //         }
                        //     });
                        // }, function(err){
                        //     if(err){
                        //         megan.log.error('fail to sub loop for get user');
                        //         mcb();
                        //     }else{
                        //         megan.log.debug('success to sub loop for get user', nowConcurrentCnt, arrRemainSession);
                        //         mcb();
                        //     }
                        // });
                    });
                }, function(err){
                    if(err){
                        megan.log.warn('fail to main loop for get user');
                        return callback({result: 0});
                    }
                    megan.log.debug('success to main loop for get user', nowConcurrentCnt, arrRemainSession);
                    callback({result: 1, cnt: nowConcurrentCnt, playLists: arrRemainSession});
                });
                return;
            }
            // 살아 있는 redis 없음
            callback({result: 1});
        });
    },
    // 동시청 사용 여부 설정
    setUseOrNot: function(req, res, callback){
        megan.log.debug(req.url);
        ++useCnt;

        var params = req.query;
        var use = params.use;

        if(megan.common.isNull(use)) return callback({result: -1, desc: 'no parameters : use'});

        megan.consistent.getNode('1', function(err, namespace) {
            if(!err) return megan.redis.set(namespace, 'use', use);
            // 살아 있는 redis 없음
            callback({result: 1});
        });

        callback({result: 1});
    },
    // pooqzone 용 전날 max 동시청 유저
    getMaxConcurrentUser: function(req, res, callback){
        megan.log.debug(req.url);

        var params = req.query;
        var uno = params.uno, date = params.date;

        if(megan.common.isNull(uno)) return callback({result: -1, desc: 'no parameters : uno'});
        if(megan.common.isNull(date)) date = megan.date.subtractDays(1);

        megan.consistent.getNode(uno, function(err, namespace){
            if(!err){
                megan.redis.get(namespace, 'm:'+uno+':'+megan.date.getDateFormat_24(date), function(err, maxConcurrentUser){
                    if(megan.common.isNull(maxConcurrentUser)) maxConcurrentUser = 0;
                    callback({result: 0, max: maxConcurrentUser});
                });
                return;
            }
            callback({result: -1});
        });
    },
    // 요청 통계
    statistics: function(){
        setInterval(function() {
            megan.log.info('permission cnt :', permissionCnt, ' delete cnt :', deleteCnt, ' concurrent user cnt :', concurrentUserCnt);

            permissionCnt = 0;
            deleteCnt = 0;
            concurrentUserCnt = 0;
            useCnt = 0;
        }, megan.config.conf.statisticsMinutes * 60 * 1000);
    },







    // permission 입력
    insertPermission: function(namespace, key, value, callback){
        megan.redis.sadd(namespace, key, value);
        megan.redis.expire(namespace, key, ttl);
        callback({result: 1});
    },
    // 최대 동시청 유저수 계산
    insertMaxConcurrentUser: function(namespace, uno, concurrentUsr){
        megan.redis.get(namespace, uno+':'+megan.date.getDate_24(), function(err, nowConcurrentUser){
            if(nowConcurrentUser > 0) {
                ++nowConcurrentUser;
                megan.redis.setex(namespace, uno+':'+megan.date.getDate_24(), nowConcurrentUser, ttl * 2);
                megan.redis.get(namespace, 'm:'+uno+':'+megan.date.getDate_24(), function (err, maxConcurrentUser) {
                    if (maxConcurrentUser > 0) {
                        if (nowConcurrentUser > maxConcurrentUser) megan.redis.setex(namespace, 'm:'+uno+':'+megan.date.getDate_24(), nowConcurrentUser, ttl * 2);
                    } else megan.redis.setex(namespace, 'm:'+uno+':'+megan.date.getDate_24(), nowConcurrentUser, ttl * 2);
                });
            } else {
                ++concurrentUsr;
                megan.redis.setex(namespace, uno+':'+megan.date.getDate_24(), concurrentUsr, ttl * 2);
                megan.redis.setex(namespace, 'm:'+uno+':'+megan.date.getDate_24(), concurrentUsr, ttl * 2);
            }
        });
    },
    // test 를 위한 bookmark 등록 20170117
    insertBookmark: function(namespace, params, callback){
        var self = this;
        var tempKey = 'b:'+params.group+':'+params.uno+':'+params.playId;
        megan.redis.setex(namespace, tempKey, self.getTestValue(params), 25);
        callback();
    },
    getTestValue: function(val){
        return JSON.stringify({
            "deviceType": "N/A",
            "apDate": megan.date.getBarDatetime(),
            "contentId": "N/A",
            "issue": megan.date.getBarDatetime(),
            "ipAddress": val.ipAddress,
            "guid": val.guid
        });
    },
    // session 정리
    arrangeSession: function(namespace, params, value, concurrentUsr, callback){
        var self = this;
        var pData, validPData, delData = '';
        var key = 'p:'+params.group+':'+params.uno;
        var validValue = value;
        var playLists;
        var idx = 0;

        if(megan.common.isNull(value)){
            if(params.limit > 1) self.insertMaxConcurrentUser(namespace, params.uno, 0);

            self.insertPermission(namespace, key, self.getValue(params), function(result){
                self.insertBookmark(namespace, params, function(){
                    callback(result);
                });
            });
            return;
        }

        async.some(value, function(e, callback){
            pData = JSON.parse(e);
            var bKey = 'b:'+params.group+':'+params.uno+':'+pData.playId;
            megan.redis.get(namespace, bKey, function(err, bData) {
                if(megan.common.isNull(bData)){
                    megan.redis.srem(namespace, key, e, function(err){
                        if(!err){
                            validValue.splice(idx, 1);

                            // 최대 동시청 유저
                            concurrentUsr--;
                            megan.redis.decr(namespace, params.uno+':'+megan.date.getDate_24());

                            callback(null, true);
                        }
                    });
                    return;
                }
                ++idx;
                playLists = JSON.parse(bData);
                callback(null, false);
            });
        }, function(err, boolDelBookmark){
            if(validValue){             // 유효한 요청 중 검색
                async.some(validValue, function(e, callback){
                    validPData = JSON.parse(e);
                    megan.log.debug('guid', validPData.guid, params.guid);
                    if(validPData.guid == params.guid){
                        megan.log.debug('ipAddress', validPData.ipAddress, params.ipAddress);
                        if(validPData.ipAddress == params.ipAddress){    // 새로고침 / 재로그인
                            delData = e;
                            megan.log.debug('result::::::::: 새로고침', delData);
                            return callback(null, true);
                        }else{
                            megan.log.debug('playId', validPData.playId, params.lastPlayId);
                            if(validPData.playId == params.lastPlayId){  // 망 변경
                                delData = e;
                                megan.log.debug('result::::::::: 망 변경', delData);
                                return callback(null, true);
                            }
                            return callback(null, false);
                        }
                    }
                    callback(null, false);
                    // 변경 20161229
                    // else{
                    // console.error('ipAddress', validPData.ipAddress, params.ipAddress);
                    // if(validPData.ipAddress == params.ipAddress){    // 브라우져 변경
                    //     self.insertPermission(namespace, key, self.getValue(params), function(result){
                    //         console.error('result::::::::: 브라우져 변경', result);
                    //     });
                    //     callback(null, true);
                    //     return;
                    // }
                    // callback(null, false);
                    // return;
                    // }
                }, function(err, boolMatchPermission){
                    // 삭제 여부 상관 없이, 검색하여 1개라도 일치 하는 게 나왔을 때
                    megan.log.debug('match ', boolMatchPermission);
                    if(boolMatchPermission){
                        // 지우고 무조건 허용
                        megan.log.debug('change permission ', delData);
                        if(!megan.common.isNull(delData)){
                            megan.redis.srem(namespace, key, delData, function(err){
                                self.insertPermission(namespace, key, self.getValue(params), function(result){
                                    self.insertBookmark(namespace, params, function(){
                                        callback(result);
                                    });
                                });
                            });
                        }
                        return;
                    }

                    //  지워짐과 상관없이 limit 을 초과하지 않으면 허용 20170201 추가
                    if (validValue.length < params.limit) {
                        // 최대 동시청 유저
                        if (params.limit > 1) self.insertMaxConcurrentUser(namespace, params.uno, concurrentUsr);

                        self.insertPermission(namespace, key, self.getValue(params), function (result) {
                            self.insertBookmark(namespace, params, function(){
                                callback(result);
                            });
                        });
                        return;
                    }

                    // 초과하는데 지워진 게 하나라도 있으면 허용
                    if(boolDelBookmark) {
                        // 최대 동시청 유저
                        if (params.limit > 1) self.insertMaxConcurrentUser(namespace, params.uno, concurrentUsr);

                        self.insertPermission(namespace, key, self.getValue(params), function (result) {
                            self.insertBookmark(namespace, params, function(){
                                callback(result);
                            });
                        });
                        return;
                    }

                    // 초과하는데 지워진 게 하나도 없으면 비허용
                    megan.log.debug('nothing delete bookmark, no permission');
                    callback({result: 0, playLists: playLists});
                });
            }
        });
    },
    // 유효 하지 않은 session 삭제
    deleteInvalidSession: function(namespace, group, params, value, callback){
        // 유효하지 않은 세션 있으면 바로 정리 후 로직 빠져 나옴. (limit 개수가 기존 개수보다 작아졌을 때 이 로직으로는 정리할 방법이 없음)
        var pData;
        var key = 'p:'+group+':'+params.uno;
        var remainSession = [];
        var cnt = value.length;

        // permission 조회 후 bookmark 데이터 있으면 가져오고 없으면 permission 정리
        if(value.length > 0){
            value.forEach(function (e, idx, arr) {
                pData = JSON.parse(e);
                var bKey = 'b:'+group+':'+params.uno+':'+pData.playId;
                megan.redis.get(namespace, bKey, function (err, bVal) {
                    if (megan.common.isNull(bVal)) {
                        megan.redis.srem(namespace, key, e);
                        cnt--;
                    } else {
                        var obj = {group: group};
                        Object.assign(obj, JSON.parse(bVal));
                        remainSession.push(obj);
                    }

                    if (idx >= value.length - 1) {
                        callback(null, cnt, remainSession);
                    }
                });
            });
            return;
        }
        callback(null, cnt, remainSession);


        // permission 데이터 유효 하지 않은 세션 하나 정리 후 list 가져옴
        // async.some(value, function(e, callback){
        //     pData = JSON.parse(e);
        //     var bKey = 'b:'+group+':'+params.uno+':'+pData.playId;
        //     megan.redis.get(namespace, bKey, function(err, bData){
        //         if(megan.common.isNull(bData)){
        //             megan.redis.srem(namespace, key, e);
        //             validValue.splice(idx, 1);
        //             cnt--;
        //             callback(null, true);
        //             return;
        //         }
        //         callback(null, false);
        //         ++idx;
        //     });
        // }, function(err, result){
        //     if(err){
        //         megan.log.debug('not found');
        //         callback(err);
        //         return;
        //     }
        //     callback(null, cnt, JSON.parse(validValue));
        // });
    },
    // 그룹 session 삭제
    deleteGroupSession: function(namespace, group, uno, callback){
        // 그룹 내 모든 세선 삭제
        var key = 'p:'+group+':'+uno;
        megan.redis.smembers(namespace, key, function(value){
            value.forEach(function(e, idx, arr){
                megan.redis.decr(namespace, uno+':'+megan.date.getDate_24());
                megan.redis.srem(namespace, key, e);
            });
        });

        callback({result: 1});
    },
    // 특정 session 삭제
    deleteSpecificSession: function(namespace, group, uno, playId, callback){
        // 그룹 내 특정 playId 삭제
        var pData;
        var key = 'p:'+group+':'+uno;
        megan.redis.smembers(namespace, key, function(value) {
            value.forEach(function (e, idx, arr) {
                pData = JSON.parse(e);
                megan.log.debug('deleteSpecificSession:', playId, pData.playId);
                if(playId == pData.playId){
                    megan.redis.decr(namespace, uno+':'+megan.date.getDate_24());
                    megan.redis.srem(namespace, key, e);
                }
            });
        });

        callback({result: 1});
    },
    getValue: function(val){
        return JSON.stringify({
            'playId': val.playId,
            'guid': val.guid,
            'ipAddress': val.ipAddress
        });
    }
};