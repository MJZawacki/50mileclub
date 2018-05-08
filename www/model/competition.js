var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var compSchema = new mongoose.Schema({
    StartDate: Date,
    CurrentWeek: Number,
    Weeks: [{type: Schema.ObjectId, ref: 'Week'}],
    InviteCode: String,
    LeaderBoard:  [{type: Schema.ObjectId, ref: 'AthleteTotal'}],
    Participants: [{type: Schema.ObjectId, ref: 'User'}]
   });
  
var Competition = module.exports = mongoose.model('Competition', compSchema);



