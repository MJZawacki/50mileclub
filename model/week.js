var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var weekSchema = new mongoose.Schema({
    WeekNum: Number,
    Results: [{type: Schema.ObjectId, ref: 'AthleteWeek'}]

   });
  
var Week = module.exports = mongoose.model('Week', weekSchema);



