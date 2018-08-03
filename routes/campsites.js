let express = require("express");
let router  = express.Router();
let Campsite = require("../models/campsite");
let Comment = require("../models/comment");
let middleware = require("../middleware");
// let geocoder = require('geocoder');
// =====================================
let NodeGeocoder = require('node-geocoder');
 
let options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};
 
let geocoder = NodeGeocoder(options);
// =====================================

let { isLoggedIn, checkUserCampsite, checkUserComment, isAdmin, isSafe } = middleware; // destructuring assignment

// Define escapeRegex function for search feature
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

//INDEX - show all campsites
router.get("/", function(req, res){
    let noMatch = null;
    // eval(require("locus"));
    // if(req.query.search && req.xhr) {
    if(req.query.search) { //if req.query.search exists, means if someone is searching for something
      const regex = new RegExp(escapeRegex(req.query.search), 'gi'); //gi = global/ignore case
      // Get all campsites from DB
      Campsite.find({name: regex}, function(err, allCampsites){
         if(err){
            console.log(err);
         } else {
             let noMatch;
             if(allCampsites.length < 1){
                //  let noMatch = "No campsite match that query. Please try again!";
                 noMatch = "No campsite match that query. Please try again!";
             }
            // res.status(200).json(allCampsites);
            res.render("campsites/index", {campsites: allCampsites, noMatch: null});
         }
      });
  } else {
      // Get all campsites from DB
        Campsite.find({}, function(err, allCampsites){
           if(err){
               console.log(err);
           } else {
              res.render("campsites/index",{campsites:allCampsites, noMatch: noMatch});
           }
        });
    }
});
             
//             // if(req.xhr) {
//             //   res.json(allCampsites);
//               res.render("campsites/index",{campsites:allCampsites, noMatch: null});
//             } else {
//             //   res.render("campsites/index",{campsites: allCampsites, page: 'campsites'});
//             // }
//          }
//       });
//   }
// });

//CREATE - add new campsite to DB
router.post("/", isLoggedIn, isSafe, function(req, res){
  // get data from form and add to campsites array
  let name = req.body.name;
  let image = req.body.image;
  let desc = req.body.description;
  let author = {
      id: req.user._id,
      username: req.user.username
  };
  let cost = req.body.cost;
  geocoder.geocode(req.body.location, function (err, data) {
    if (err || data.status === 'ZERO_RESULTS') {
      req.flash('error', 'Invalid address');
      return res.redirect('back');
    }
    // let lat = data.results[0].geometry.location.lat;
    // let lng = data.results[0].geometry.location.lng;
    // let location = data.results[0].formatted_address;
    // let newCampsite = {name: name, image: image, description: desc, cost: cost, author:author, location: location, lat: lat, lng: lng};
    let newCampsite = {name: name, image: image, description: desc, cost: cost, author:author};
    // Create a new campsite and save to DB
    Campsite.create(newCampsite, function(err, newlyCreated){
        if(err){
            console.log(err);
        } else {
            //redirect back to campsites page
            console.log(newlyCreated);
            res.redirect("/campsites");
        }
    });
  });
});

//NEW - show form to create new campsite
router.get("/new", isLoggedIn, function(req, res){
   res.render("campsites/new"); 
});

// SHOW - shows more info about one campsite
router.get("/:id", function(req, res){
    //find the campsite with provided ID
    Campsite.findById(req.params.id).populate("comments").exec(function(err, foundCampsite){
        if(err || !foundCampsite){
            console.log(err);
            req.flash('error', 'Sorry, that campsite does not exist!');
            return res.redirect('/campsites');
        }
        console.log(foundCampsite);
        //render show template with that campsite
        res.render("campsites/show", {campsite: foundCampsite});
    });
});

// EDIT - shows edit form for a campsite
router.get("/:id/edit", isLoggedIn, checkUserCampsite, function(req, res){
  //render edit template with that campsite
  res.render("campsites/edit", {campsite: req.campsite});
});

// PUT - updates campsite in the database
router.put("/:id", isSafe, function(req, res){
  geocoder.geocode(req.body.location, function (err, data) {
    // let lat = data.results[0].geometry.location.lat;
    // let lng = data.results[0].geometry.location.lng;
    // let location = data.results[0].formatted_address;
    // let newData = {name: req.body.name, image: req.body.image, description: req.body.description, cost: req.body.cost, location: location, lat: lat, lng: lng};
    let newData = {name: req.body.name, image: req.body.image, description: req.body.description, cost: req.body.cost};
    Campsite.findByIdAndUpdate(req.params.id, {$set: newData}, function(err, campsite){
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            req.flash("success","Successfully Updated!");
            res.redirect("/campsites/" + campsite._id);
        }
    });
  });
});

// router.put("/:id", middleware.checkCampsiteOwnership, function(req, res){
//   geocoder.geocode(req.body.location, function (err, data) {
//     if (err || !data.length) {
//       req.flash('error', 'Invalid address');
//       return res.redirect('back');
//     }
//     req.body.campsite.lat = data[0].latitude;
//     req.body.campsite.lng = data[0].longitude;
//     req.body.campsite.location = data[0].formattedAddress;

//     Campsite.findByIdAndUpdate(req.params.id, req.body.campsite, function(err, campsite){
//         if(err){
//             req.flash("error", err.message);
//             res.redirect("back");
//         } else {
//             req.flash("success","Successfully Updated!");
//             res.redirect("/campsites/" + campsite._id);
//         }
//     });
//   });
// });

// DELETE - removes campsite and its comments from the database
router.delete("/:id", isLoggedIn, checkUserCampsite, function(req, res) {
    Comment.remove({
      _id: {
        $in: req.campsite.comments
      }
    }, function(err) {
      if(err) {
          req.flash('error', err.message);
          res.redirect('/');
      } else {
          req.campsite.remove(function(err) {
            if(err) {
                req.flash('error', err.message);
                return res.redirect('/');
            }
            req.flash('error', 'Campsite deleted!');
            res.redirect('/campsites');
          });
      }
    })
});

module.exports = router;