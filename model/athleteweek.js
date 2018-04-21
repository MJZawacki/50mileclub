var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var athleteWeekSchema = new mongoose.Schema({
    AthleteName: String,
    AthleteID: String,
    TotalDistance: Number,
    IndoorRides: Number,
    OutdoorRides: Number,
    Week: {type: Schema.ObjectId, ref: 'Week'},
    Activities: [String]
   });
  
var AthleteWeek = module.exports = mongoose.model('AthleteWeek', athleteWeekSchema);



