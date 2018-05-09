var mongoose = require('mongoose');
var Promise = require('bluebird');
mongoose.Promise = Promise;
var User = mongoose.model('User');
var Competition = mongoose.model('Competition');
var AthleteWeek = mongoose.model('AthleteWeek');
var strava = require('strava-v3');
var bunyan = require('bunyan');
var log = bunyan.createLogger({
    name: 'Microsoft OIDC Example Web Application'
});
var Promise = require("bluebird");
var request = require("request-promise");


exports.getAccessCode = function (oid, callback) {


    User.find({ 'OID': oid }, function (err, users) {
        if (err) {
            onErr(err, callback);
        } else {

            console.log(users);
            callback("", users);
        }
    });

};

exports.addUserToComp = function (userid, comp, callback) {

};

exports.getCompUsers = function (compid, callback) {


};



exports.getUserAccessCodes = function (userids, callback) {

}



exports.getthisweeknum = function(comp) {
    let startdate = comp.StartDate;
    let today = Date.now();
    let completedweeks = Math.floor(Math.abs(today - startdate) / (1000 * 60 * 60 * 24 * 7));
    return completedweeks + 1;
}

exports.getCompByInvite = function (invitecode, callback) {

    Competition.findOne({ InviteCode: invitecode }, function (err, comps) {
        if (err) {
            onErr(err, callback);
        } else {

            console.log(comps);
            callback("", comps);
        }
    });
}

var getweek = function (starttime, weeknum = 1) {
    starttime = new Date(starttime);
    //Calcing the starting point
    weeknum = weeknum - 1;
    //starttime = new Date(2018,2,7); for testing
    log.info(starttime);
    // monday: 0 getDay returns 1
    // tuesday: 1 getDay returns 2
    // sunday: 6 getDay returns 0
    var offset;
    var curday = starttime.getDay();
    if (curday > 0) {
        offset = curday - 1;
    } else {
        offset = 6;
    }
    var startofWeek = new Date(starttime.setDate(starttime.getDate() - offset + (weeknum * 7)));
    startofWeek = new Date(startofWeek.setHours(0, 0, 0, 0));
    log.info(startofWeek);

    var StartDate = new Date(startofWeek);
    var EndDate = new Date(startofWeek.setDate(startofWeek.getDate() + 7));
    return [StartDate.getTime() / 1000, EndDate.getTime() / 1000];
}

exports.getLatestCompStats = function (comp) {
    var stats = [];
    var promises = [];
  
    return comp.populate('Participants').execPopulate().then((comp) => {
        return comp.Participants
    }).each((thisuser, index) => {
            return exports.getStats(comp, thisuser, exports.getthisweeknum(comp)).then((stat) =>
            {
              stats.push(stat[0]);  
            });
    }).then(participants => {
        return stats;
    });
}

exports.getStats = function(comp, user, weeknum) {
    if (weeknum == null) {
        return AthleteWeek.find({ AthleteID: user.AthleteID }).sort('-WeekNum').exec();
        
    } else {

        return AthleteWeek.where({ AthleteID: user.AthleteID, WeekNum: weeknum}).exec();
    }
}

exports.getStravaCompData = function (access_token, user, start_date, weeknum) {
    var data = null;
    if (start_date == null) {
        start_date = Date.now();
    }
    if (weeknum == null) {
        weeknum = 1;
    }
    week = getweek(start_date, weeknum);


    var options = { method: 'GET',
        url: 'https://www.strava.com/api/v3/athlete/activities',
        qs: { page:'1', before: week[1], after: week[0] },
    headers: 
    { Authorization: 'Bearer d5510c62f7719c71218b22a0db68c7dded17521d',
        'Content-Type': 'application/json' },
    };

    return request(options).then((payload) => {
            payload = JSON.parse(payload);
            var numactivities = payload.length;
            var distance = 0;
            var ride_details = [];
            var trainerrides = 0;
            var outdoorrides = 0;
            for (var i = 0; i < payload.length; i++) {
                if (payload[i].type == 'Ride')
                    distance += payload[i].distance;
                if (payload[i].trainer)
                    trainerrides++;
                else
                    outdoorrides++;
                ride_details.push(payload[i].id);
            }

            distance = distance * 0.00062137;

            data = {
                AthleteName: user.AthleteName,
                AthleteID: user.AthleteID,
                TotalDistance: distance,
                IndoorRides: trainerrides,
                WeekNum: weeknum,
                OutdoorRides: outdoorrides,
                Activities: ride_details
            }

            log.info(data);
            return new AthleteWeek(data);
        }).catch(function (err) {
            log.error(err);
        });
    //TODO handle limits (err,payload,limits) => {
}

var onErr = function (err, callback) {
    callback(err);
};