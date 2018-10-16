/**
 * Created by megan on 2016-11-09.
 */

var concurrentController = require('../controllers/concurrentController');

// 상태 체크
exports.healthCheck = function(req, res){
    res.sendStatus(200);
};

// 접근 권한
exports.getPermission = function(req, res){
    concurrentController.getPermission(req, res, function(rows){
        res.send(rows);
    });
};

// 유저 데이터 삭제
exports.deletePermission = function(req, res){
    concurrentController.deletePermission(req, res, function(rows){
        res.send(rows);
    });
};

// 동시청 유저
exports.getCoucurrentUser = function(req, res){
    concurrentController.getCoucurrentUser(req, res, function(rows){
        res.send(rows);
    });
};

// 동시청 사용 여부 설정
exports.setUseOrNot = function(req, res){
    concurrentController.setUseOrNot(req, res, function(rows){
        res.send(rows);
    });
};

// 최대 동시청 유저
exports.getMaxConcurrentUser = function(req, res){
    concurrentController.getMaxConcurrentUser(req, res, function(rows){
        res.send(rows);
    });
};

// 요청 통계
exports.statistics = function(){
    concurrentController.statistics();
};