var config = require('./config');
var strava = require('strava-v3');
var url = require('url');
var user = require('./model/user');
var competition = require('./model/competition');
var week = require('./model/week');
var athleteweek = require('./model/athleteweek');
var athletetotal = require('./model/athletetotal');
var dataaccess = require('./dataaccess');
var bunyan = require('bunyan');

// set up database for express session
var mongoose = require('mongoose');
var Promise = require('bluebird');
mongoose.Promise = Promise
mongoose.connect(config.databaseUri);
var User = mongoose.model('User');
var Competition = mongoose.model('Competition');
var AthleteWeek = mongoose.model('AthleteWeek');
var Schema = mongoose.Schema;

Promise.longStackTraces();

// CONNECTION EVENTS
// When successfully connected
mongoose.connection.on('connected', function () {
  console.log('Mongoose default connection open to ' + config.databaseUri);
});

// If the connection throws an error
mongoose.connection.on('error', function (err) {
  console.log('Mongoose default connection error: ' + err);
});

// When the connection is disconnected
mongoose.connection.on('disconnected', function () {
  console.log('Mongoose default connection disconnected');
});

// If the Node process ends, close the Mongoose connection 
process.on('SIGINT', function () {
  mongoose.connection.close(function () {
    console.log('Mongoose default connection disconnected through app termination');
    process.exit(0);
  });
});

let id = 'Ax3g1i';

var log = bunyan.createLogger({
  name: 'Strava Competition Scheduled Update'
});



// query for users in comp
Competition.
  findOne({ InviteCode: id }).
  populate('Participants').exec().
  timeout(60000).
  then((competition) => {

    
    let startdate=competition.StartDate;
    let today = new Date(Date.now());
    //let completedweeks = (today - startdate).Days() / 7
    let completedweeks = Math.floor(Math.abs(today - startdate) / (1000 * 60 * 60 * 24 * 7));
    let thisweek = completedweeks + 1;
    userjobs = [];
    for (var i=0; i<competition.Participants.length; i++) 
    {
      current_user = competition.Participants[i];
      console.log('The participant is %s', current_user.AthleteID);

      // get access_code's
      var access_token = current_user.StravaAccessCode;

      // check for existing data
      userjobs.push(AthleteWeek.find({ AthleteID: current_user.AthleteID}).exec().then((athleteweekdata) => {
          // TODO Sort by week
   
          // TODO check validity of access_token
          
          var weekpromises = [];
          var lastrecordedweek = athleteweekdata.length
          // missing weeks
          for (j=athleteweekdata.length+1;j<=completedweeks; j++) {
            // query strava and add week to db
           weekpromises.push( 
             dataaccess.getStravaCompData(access_token, current_user, competition.StartDate, j).then((data) => {
              
                // add week to athleteweekdata
                // upsert
                return data.save();
              })
            );
            lastrecordedweek = j;
          } // end week for
          
          weekpromises.push(dataaccess.getStravaCompData(access_token, current_user, competition.StartDate, thisweek).then((data) => {
              
              // first update of this week
              if (data.WeekNum > lastrecordedweek) {
                // add week to db
                return data.save();
              } else if (data.WeekNum == lastrecordedweek) {
                // update week in db
                let newdata = { IndoorRides: data.IndoorRides,
                                OutdoorRides: data.OutdoorRides,
                                TotalDistance: data.TotalDistance
                              } 
                return AthleteWeek.where({ AthleteID: data.AthleteID, WeekNum: data.WeekNum }).update(newdata).exec();

                
              }
          }));
          return Promise.all(weekpromises)
        }).then((result) => {
          console.log("end of participant " + current_user.AthleteID);
          // Update 
          return;
        }).catch((err) => {
          console.log(err)
        }));
    } // end userjobs for
    return Promise.all(userjobs);
  }).then((results) => {
      console.log("End of User Updates");
      mongoose.connection.close();
      return;
  }).catch((err) => {
      console.log("end of update error " + err);
  });


