//Required As First Package
require('dotenv').config();

// == SETUP DEPENDECIES FOR APPLICATION ==
let express             = require("express"),
    app                 = express(),
    bodyParser          = require("body-parser"),
    mongoose            = require("mongoose"),
    flash               = require("connect-flash"),
    passport            = require("passport"),
    LocalStrategy       = require("passport-local"),
    methodOverride      = require("method-override"),
    Campsite            = require("./models/campsite"),
    Comment             = require("./models/comment"),
    User                = require("./models/user");
    // seedDB              = require("./seeds");
    
// == REQUIRING ROUTES ==
let commentRoutes       = require("./routes/comments"),
    campsiteRoutes      = require("./routes/campsites"),
    indexRoutes         = require("./routes/index");

// == CONNECT TO DATABASE ==
mongoose.connect(process.env.DATABASEURL, {useNewUrlParser: true}) || "mongodb://localhost:27017/kwonfit";

app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());
// seedDB(); //seed the database

// == PASSPORT CONFIGURATION ==
app.use(require("express-session")({
    secret: "Moments after finishing my workout!",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

// == USING MOMEMT JS TO ADD "time since" ==
app.locals.moment = require("moment");

app.use("/", indexRoutes);
app.use("/campsites", campsiteRoutes);
app.use("/campsites/:id/comments", commentRoutes);

// == LISTEN ==
app.listen(process.env.PORT, process.env.IP, function(){
    console.log("KwonFitCamp has started"); 
});

