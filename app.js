

'use strict';

/******************************************************************************
 * Module dependencies.
 *****************************************************************************/

var express = require('express');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var passport = require('passport');
var util = require('util');
var bunyan = require('bunyan');
var config = require('./config');
var strava = require('strava-v3');
var url = require('url');
var user = require('./model/user');
var competition = require('./model/competition');
var week = require('./model/week');
var athleteweek = require('./model/athleteweek');
var athletetotal = require('./model/athletetotal');
var dataaccess = require('./dataaccess');

// set up database for express session
var MongoStore = require('connect-mongo')(expressSession);
var mongoose = require('mongoose');
var User = mongoose.model('User');
var Competition = mongoose.model('Competition');
var Schema = mongoose.Schema;

// Start QuickStart here

var OIDCStrategy = require('passport-azure-ad').OIDCStrategy;

var log = bunyan.createLogger({
    name: 'Microsoft OIDC Example Web Application'
});

/******************************************************************************
 * Set up passport in the app 
 ******************************************************************************/

//-----------------------------------------------------------------------------
// To support persistent login sessions, Passport needs to be able to
// serialize users into and deserialize users out of the session.  Typically,
// this will be as simple as storing the user ID when serializing, and finding
// the user by ID when deserializing.
//-----------------------------------------------------------------------------
passport.serializeUser(function(user, done) {
  done(null, user.oid);
});

passport.deserializeUser(function(oid, done) {
  findByOid(oid, function (err, user) {
    done(err, user);
  });
});

// array to hold logged in users
var users = [];

var findByOid = function(oid, fn) {
  for (var i = 0, len = users.length; i < len; i++) {
    var user = users[i];
   log.info('we are using user: ', user);
    if (user.oid === oid) {
      return fn(null, user);
    }
  }
  return fn(null, null);
};

//-----------------------------------------------------------------------------
// Use the OIDCStrategy within Passport.
// 
// Strategies in passport require a `verify` function, which accepts credentials
// (in this case, the `oid` claim in id_token), and invoke a callback to find
// the corresponding user object.
// 
// The following are the accepted prototypes for the `verify` function
// (1) function(iss, sub, done)
// (2) function(iss, sub, profile, done)
// (3) function(iss, sub, profile, access_token, refresh_token, done)
// (4) function(iss, sub, profile, access_token, refresh_token, params, done)
// (5) function(iss, sub, profile, jwtClaims, access_token, refresh_token, params, done)
// (6) prototype (1)-(5) with an additional `req` parameter as the first parameter
//
// To do prototype (6), passReqToCallback must be set to true in the config.
//-----------------------------------------------------------------------------
passport.use(new OIDCStrategy({
    identityMetadata: config.creds.identityMetadata,
    clientID: config.creds.clientID,
    responseType: config.creds.responseType,
    responseMode: config.creds.responseMode,
    redirectUrl: config.creds.redirectUrl,
    allowHttpForRedirectUrl: config.creds.allowHttpForRedirectUrl,
    clientSecret: config.creds.clientSecret,
    validateIssuer: config.creds.validateIssuer,
    isB2C: config.creds.isB2C,
    issuer: config.creds.issuer,
    passReqToCallback: config.creds.passReqToCallback,
    scope: config.creds.scope,
    loggingLevel: config.creds.loggingLevel,
    nonceLifetime: config.creds.nonceLifetime,
    nonceMaxAmount: config.creds.nonceMaxAmount,
    useCookieInsteadOfSession: config.creds.useCookieInsteadOfSession,
    cookieEncryptionKeys: config.creds.cookieEncryptionKeys,
    clockSkew: config.creds.clockSkew,
  },
  function(iss, sub, profile, accessToken, refreshToken, done) {
    if (!profile.oid) {
      return done(new Error("No oid found"), null);
    }
    // asynchronous verification, for effect...
    process.nextTick(function () {
      findByOid(profile.oid, function(err, user) {
        if (err) {
          return done(err);
        }
        if (!user) {
          // "Auto-registration"
          users.push(profile);
          return done(null, profile);
        }
        return done(null, user);
      });
    });
  }
));


//-----------------------------------------------------------------------------
// Config the app, include middlewares
//-----------------------------------------------------------------------------
var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.set('trust proxy', 1) // trust first proxy
app.use(express.logger());
app.use(methodOverride());
app.use(cookieParser());

// set up session middleware
if (config.useMongoDBSessionStore) {
  mongoose.connect(config.databaseUri);
  app.use(express.session({
    secret: 'secret',
    cookie: {
      maxAge: config.mongoDBSessionMaxAge * 1000,
      httpOnly: true,
      //sameSite: 'strict',
      secure: false, // need to switch if local debug
      proxy: true
    },

    store: new MongoStore({
      mongooseConnection: mongoose.connection,
      clear_interval: config.mongoDBSessionMaxAge
    })
  }));
} else {
  app.use(expressSession({ secret: 'keyboard cat', resave: true, saveUninitialized: false }));
}

app.use(bodyParser.urlencoded({ extended : true }));

// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(__dirname + '/../../public'));

//-----------------------------------------------------------------------------
// Set up the route controller
//
// 1. For 'login' route and 'returnURL' route, use `passport.authenticate`. 
// This way the passport middleware can redirect the user to login page, receive
// id_token etc from returnURL.
//
// 2. For the routes you want to check if user is already logged in, use 
// `ensureAuthenticated`. It checks if there is an user stored in session, if not
// it will call `passport.authenticate` to ask for user to log in.
//-----------------------------------------------------------------------------
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
};

app.get('/', function(req, res) {
    log.debug("Passport: " + req.session.passport);
    console.log("Session: " + req.session.id);
    log.debug("ThisUser:" + req.session.thisuser);
    log.debug("User: " + req.user);
    log.debug("access_token: " + req.session.access_token)
    if ((req.user != null) && (req.session.access_token != null)) {
      // get strava data
      var access_token = req.session.access_token;
      var week = getweek();
      var thisuser = req.session.thisuser;
      // martin: 10041766
      // me: 145873
      var access_token = access_token;
      //var athlete_name = authpayload.firstname + " " + authpayload.lastname;
      strava.athlete.listActivities({ 'access_token': access_token, id: thisuser.AthleteID, after: week[0], before: week[1]},function(err,payload,limits) {
      //strava.athlete.get({},function(err,payload,limits) {
          if(!err) {
              var numactivities = payload.length;
              var distance = 0;
              var ride_details = [];
              for (var i = 0; i < payload.length; i++) {
                if (payload[i].type == 'Ride')
                  distance += payload[i].distance;
                  ride_details.push({ trainer: payload[i].trainer,
                    type: payload[i].type,
                  id: payload[i].id,
                distance: payload[i].distance * 0.00062137 })
              }
              
              distance = distance * 0.00062137;
              res.render('pages/index', 
                { stats: [{name: 'mike', distance: 50, roadrides: 1, trainerrides: 0}],
                user: req.user, 
                  stravadata: { distance: parseFloat(Math.round(distance * 100) / 100).toFixed(2), 
                                numactivities: numactivities 
                              }
                  
                });
              
              log.info(payload);
          }
          else {
              res.error(err);
              log.error(err);
          }
      });

    } else {
      res.render('pages/index', { user: req.user, stravadata: { distance: 'n/a/' }, stats: null });
    }
  
});

app.get('/createcomp', ensureAuthenticated, function(req,res) {

  var competition = new Competition({
    StartDate: new Date(2018, 3, 26, 0, 0 ),
    CurrentWeek: 3,
    InviteCode: 'Ax3g1i'
  });
  
  competition.save(function (err) {
    if (err) return handleError(err);
  

  });
});

app.get('/dashboard', ensureAuthenticated, function(req, res) {
  
  console.log("ThisUser:" + req.session.thisuser);
    console.log("User: " + req.user);
    console.log("access_token: " + req.session.access_token)
    if ((req.user != null) && (req.session.access_token != null)) {
      // get strava data
      var access_token = req.session.access_token;
      var week = getweek();
      var thisuser = req.session.thisuser;
      // martin: 10041766
      // me: 145873
      var access_token = access_token;
      //var athlete_name = authpayload.firstname + " " + authpayload.lastname;
      strava.athlete.listActivities({ 'access_token': access_token, id: thisuser.AthleteID, after: week[0], before: week[1]},function(err,payload,limits) {
      //strava.athlete.get({},function(err,payload,limits) {
          if(!err) {
              var distance = 0;
              for (var i = 0; i < payload.length; i++) {
                  distance += payload[i].distance;
              }
  
              distance = distance * 0.00062137;
              res.render('pages/index', { user: req.user, stravadata: { distance: distance } });
              
              log.info(payload);
          }
          else {
              res.error(err);
              log.error(err);
          }
      });

    } else {
      res.redirect('/');
    }
  
});

// '/account' is only available to logged in user
app.get('/account', ensureAuthenticated, function(req, res) {
  res.render('pages/account', { user: req.user });
});

app.get('/connectstrava', ensureAuthenticated, function(req, res) {
  if (req.query.code == undefined) {
    res.redirect(strava.oauth.getRequestAccessURL({ scope: 'view_private'}));
  } else {
    strava.oauth.getToken(req.query.code, (err,authpayload,limits) => {
      // save token to user
      var access_token = authpayload.access_token;
      req.session.access_token = access_token;
      var updatedUser = {
        Email: req.user.emails[0],
        DisplayName: req.user.displayName,
        City: req.user._json.city,
        State: req.user._json.state,
        OID: req.user.oid,
        CurrentComp: null,
        StravaAccessCode: access_token,
        AthleteID: authpayload.athlete.id,
        CreatedOn: Date.now(),
        AthleteName: authpayload.athlete.firstname + " " + authpayload.athlete.lastname
    
      }
      var query = { 'OID': req.user.oid };
      User.findOneAndUpdate(query, updatedUser, {upsert:true}, function(err, doc){
        if (err) return res.send(500, { error: err });
        req.session.thisuser = updatedUser;
        req.session.save((err) => {
          res.redirect('/');
        })
      });
    });
  }
});

app.get('/joincode', ensureAuthenticated, function(req, res, next) {
  res.render('pages/joincode', { user: req.user });
});

app.post('updateWeek', ensureAuthenticated, function(req, res, next) {

});

app.post('/submitcode', ensureAuthenticated, function(req, res, next) {

  dataaccess.getCompByInvite(req.body.invitecode, (err, comp) => {
    
    if (comp.length == 1) {
    // create user
    User.create({
      Email: req.user.emails[0],
      DisplayName: req.user.displayName,
      City: req.user._json.city,
      State: req.user._json.state,
      OID: req.user.oid,
      CurrentComp: null,
      StravaAccessCode: null,
      AthleteID: null,
      CreatedOn: Date.now(),
      Competition: comp._id
  
    }, function(err, user) {
      var strOutput;

      if (err) {
        console.log(err);
        strOutput = 'Oh dear, we\'ve got an error';
      } else {
        console.log('User created: ' + user);
      
        //connect to strava
        res.redirect(strava.oauth.getRequestAccessURL({ scope: 'view_private'}));
      }

   
    });
   } else {
      res.render('/joincode', { validationerror: "Your code is not valid." })
    }
  });
});

app.get('/login',
  function(req, res, next) {
    passport.authenticate('azuread-openidconnect', 
      { 
        response: res,                      // required
        resourceURL: config.resourceURL,    // optional. Provide a value if you want to specify the resource.
        customState: 'my_state',            // optional. Provide a value if you want to provide custom state value.
        failureRedirect: '/' 
      }
    )(req, res, next);
  },
  function(req, res) {
    log.info('Login was called in the Sample');
    res.redirect('/');
});

app.get('/_status/healthz', (req, res) => {
  res.status(200).send();
});



// 'POST returnURL'
// `passport.authenticate` will try to authenticate the content returned in
// body (such as authorization code). If authentication fails, user will be
// redirected to '/' (home page); otherwise, it passes to the next middleware.
app.post('/auth/openid/return',
  function(req, res, next) {
    passport.authenticate('azuread-openidconnect', 
      { 
        response: res,                      // required
        failureRedirect: '/'  
      }
    )(req, res, next);
  },
  function(req, res) {
    log.info('We received a return from AzureAD.');
    // is user already in our db? if not, get more details
    dataaccess.getAccessCode(req.user.oid, (err, users) => {
      if (users.length >= 1) {
        var thisuser = users[0];
        if (thisuser.StravaAccessCode == null) {
          //redirect to strava
          res.redirect(strava.oauth.getRequestAccessURL({ scope: 'view_private'}));
        } else {
          // merge data and redirect to /
          req.session.thisuser = thisuser;
          req.session.access_token = thisuser.StravaAccessCode
          req.session.save((err) => {
            res.redirect('/');
          })
        }
      } else {
        // redirect user to 
        res.redirect('/joincode')
      }
    
    });
  });

// 'logout' route, logout from passport, and destroy the session with AAD.
app.get('/logout', function(req, res){
  req.session.destroy(function(err) {
    req.logOut();
    res.redirect(config.destroySessionUrl);
  });
});

// Create the database connection 
var dbURI = 'mongodb://' + config.mongodb.hostname + ":27016/" + config.mongodb.dbname;
mongoose.connect(dbURI); 

// CONNECTION EVENTS
// When successfully connected
mongoose.connection.on('connected', function () {  
  console.log('Mongoose default connection open to ' + dbURI);
}); 

// If the connection throws an error
mongoose.connection.on('error',function (err) {  
  console.log('Mongoose default connection error: ' + err);
}); 

// When the connection is disconnected
mongoose.connection.on('disconnected', function () {  
  console.log('Mongoose default connection disconnected'); 
});

// If the Node process ends, close the Mongoose connection 
process.on('SIGINT', function() {  
  mongoose.connection.close(function () { 
    console.log('Mongoose default connection disconnected through app termination'); 
    process.exit(0); 
  }); 
}); 

app.listen(3000);

var getweek = function()
{
        //Calcing the starting point
    var currenttime = new Date(Date.now()); // TODO timezone offset for pacific
    //currenttime = new Date(2018,2,7); for testing
    log.info(currenttime);
    // monday: 0 getDay returns 1
    // tuesday: 1 getDay returns 2
    // sunday: 6 getDay returns 0
    var offset;
    var curday = currenttime.getDay();
    if (curday > 0) {
        offset = curday - 1;
    } else {
        offset = 6;
    }
    var startofWeek = new Date(currenttime.setDate(currenttime.getDate() - offset));
    startofWeek = new Date(startofWeek.setHours(0,0,0,0));
    log.info(startofWeek);
    
    var StartDate = new Date(startofWeek);
    var EndDate = new Date(startofWeek.setDate(startofWeek.getDate() + 7));
    return [StartDate.getTime() / 1000, EndDate.getTime() / 1000];
}