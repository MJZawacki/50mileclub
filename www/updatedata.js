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


dataaccess.updateAllCompData(id).then(function() {
  mongoose.connection.close();
});
