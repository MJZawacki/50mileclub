var mongoose = require('mongoose');
var User = mongoose.model('User');

exports.getAccessCode = function(oid,callback) {


    User.find({'OID':oid}, function (err, users) {
     if(err){
      onErr(err,callback);
     }else{
     
      console.log(users);
      callback("",users);
     }
    })
  
};

exports.getCompData = function(oid,callback) {
    
    
}

exports.getCompByInvite = function(invitecode, callback) {

    Competition.find({ InviteCode: invitecode}, function(err, comps) {
        if(err){
            onErr(err,callback);
        } else {
     
            console.log(comps);
            callback("",comps);
        }
    });
}

var onErr = function(err,callback){
    callback(err);
    };