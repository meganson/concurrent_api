/**
 * Created by megan on 2016-11-09.
 */

module.exports = {
    name: 'permission',
    // Uno
    // Guid
    // Cip
    // Limit - 최대동시접속자수
    // Last Play ID - 플레이어에서 받은 값, 현재 Player가 스트리밍을 재생하는데 사용하는 Play ID
    // New Play ID - Permission에서 신규로 발급하려고 하는 Play ID
    setParameter: function(data){
        return {
            "group": data.group,
            "uno": data.uno,
            "limit": data.limit || 1,
            "guid": data.guid,      // device id (안드 설치시, ie 등 진입시 등)
            "ipAddress": data.ipAddress,
            "playId": data.playId,      // session id (새로고침, 화면변경, 일시정지 후 재생)
            "lastPlayId": data.lastPlayId
        };
    },
    getResult: function(result, playList){
        return {
            "result": result,
            "playList": playList
        }
    }
};