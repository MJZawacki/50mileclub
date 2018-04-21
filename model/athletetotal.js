var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var athleteTotalSchema = new mongoose.Schema({
    AthleteName: String,
    AthleteID: String,
    TotalDistance: Number,
    IndoorRides: Number,
    OutdoorRides: Number
   });
  
var AthleteTotal = module.exports = mongoose.model('AthleteTotal', athleteTotalSchema);



