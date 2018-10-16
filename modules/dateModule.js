/**
 * Created by megan on 2017-01-10.
 */

var moment = require('moment');

var DateModule = function(){};

DateModule.prototype.getTimeDifference = function(){
    var d = new Date();
    //time diff
    var tdm = d.getTimezoneOffset();
    return tdm / 60;
};

DateModule.prototype.getNowHoursTimezone = function(th){
    var d = new Date();
    //time diff
    var tdm = d.getTimezoneOffset();
    var tdh = (tdm / 60);

    var h = d.getHours();
    h = (h + (tdh + th)) % 24;
    return h;
};

DateModule.prototype.getDatetime = function(){
    return new Date().getTime();
};

DateModule.prototype.getDatetimeFormat = function(date){
    return new Date(date).getTime();
};

DateModule.prototype.getDateFormat = function(date){
    return new Date(date);
};

DateModule.prototype.getBarDatetime = function(){
    return moment(new Date().getTime()).format('YYYY-MM-DD hh:mm:ss');
};

DateModule.prototype.getBarDatetimeMs = function(){
    return moment(new Date().getTime()).format('YYYY-MM-DD hh:mm:ss.SSS');
};

DateModule.prototype.getBarDatetimeMsFormat = function(date){
    return moment(date).format('YYYY-MM-DD hh:mm:ss.SSS');
};

DateModule.prototype.getBarDatetime_24 = function(){
    return moment(new Date().getTime()).format('YYYY-MM-DD HH:mm:ss');
};

DateModule.prototype.getBarDatetimeMs_24 = function(){
    return moment(new Date().getTime()).format('YYYY-MM-DD HH:mm:ss.SSS');
};

DateModule.prototype.getBarDatetimeMsFormat_24 = function(date){
    return moment(date).format('YYYY-MM-DD HH:mm:ss.SSS');
};

DateModule.prototype.getDate_24 = function(){
    return moment(new Date().getTime()).format('YYYYMMDD');
};

DateModule.prototype.getDateFormat_24 = function(date){
    return moment(date).format('YYYYMMDD');
};

DateModule.prototype.addDays = function(days){
    var date = new Date();
    date.setDate(date.getDate() + parseInt(days));
    return date;
};

DateModule.prototype.subtractDays = function(days){
    var date = new Date();
    date.setDate(date.getDate() - parseInt(days));
    return date;
};

module.exports = new DateModule();
