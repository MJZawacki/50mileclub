var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var athleteWeekSchema = new mongoose.Schema({
    AthleteName: String,
    AthleteID: String,
    TotalDistance: Number,
    IndoorRides: Number,
    CompID: {type: Schema.ObjectId, ref: 'Competition'},
    WeekNum: Number,
    OutdoorRides: Number,
    Activities: [Number] // activity id's
   });
  
var AthleteWeek = module.exports = mongoose.model('AthleteWeek', athleteWeekSchema);



