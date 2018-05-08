var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new mongoose.Schema({
    Email: String,
    DisplayName: String,
    City: String,
    State: String,
    OID: String,
    CurrentComp: String,
    StravaAccessCode: String,
    AthleteID: String,
    CreatedOn: Date,
    AthleteName: String,
    Competition: {type: Schema.ObjectId, ref: 'Competition'}
   });
  
var User = module.exports = mongoose.model('User', userSchema);



