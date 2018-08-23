let express = require("express");
let router = express.Router();
let Campsite = require("../models/campsite");
let middleware = require("../middleware");
let NodeGeocoder = require("node-geocoder");

// == CONFIGURE CLOUDINARY ==
let multer = require('multer');
let storage = multer.diskStorage({
    filename: function (req, file, callback) {
        callback(null, Date.now() + file.originalname);
    }
});
let imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
let upload = multer({
    storage: storage,
    fileFilter: imageFilter
});

let cloudinary = require('cloudinary');
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

let {
    isLoggedIn,
    checkUserCampsite,
    // checkUserComment,
    // isAdmin,
    // isSafe
} = middleware;


let options = {
    provider: "google",
    httpAdapter: "https",
    api_Key: process.env.GEOCODER_API_KEY,
    formatter: null
};

let geocoder = NodeGeocoder(options);

// Define escapeRegex function for search feature
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

//INDEX - show all campsites
router.get("/", function (req, res) {
    let noMatch = null;
    // eval(require("locus"));
    // if(req.query.search && req.xhr) {
    if (req.query.search) { //if req.query.search exists, means if someone is searching for something
        const regex = new RegExp(escapeRegex(req.query.search), 'gi'); //gi = global/ignore case
        // Get all campsites from DB
        Campsite.find({
            name: regex
        }, function (err, allCampsites) {
            if (err) {
                console.log(err);
            } else {
                let noMatch;
                if (allCampsites.length < 1) {
                    //  let noMatch = "No campsite match that query. Please try again!";
                    noMatch = "No campsite match that query. Please try again!";
                }
                // res.status(200).json(allCampsites);
                res.render("campsites/index", {
                    campsites: allCampsites,
                    noMatch: null
                });
            }
        });
    } else {
        // Get all campsites from DB
        Campsite.find({}, function (err, allCampsites) {
            if (err) {
                console.log(err);
            } else {
                res.render("campsites/index", {
                    campsites: allCampsites,
                    noMatch: noMatch
                });
            }
        });
    }
});

//CREATE - add new campsite to DB
router.post("/", isLoggedIn, upload.single("image"), function (req, res) {
    // get data from form and add to campsites array
    var name = req.body.name;
    var image = req.body.image;
    var desc = req.body.description;
    var author = {
        id: req.user._id,
        username: req.user.username
    };
    geocoder.geocode(req.body.location, function (err, data) {
        if (err || !data.length) {
            req.flash('error', 'Invalid address');
            return res.redirect('back');
        }
        let lat = data[0].latitude;
        let lng = data[0].longitude;
        let location = data[0].formattedAddress;
        let newCampsite = {
            name: name,
            image: image,
            description: desc,
            author: author,
            location: location,
            lat: lat,
            lng: lng
        };
        cloudinary.v2.uploader.upload(req.file.path, function (err, result) {
            if (err) {
                req.flash('error', err.message);
                return res.redirect('back');
            }
            // == add cloudinary url for the image to the campsite object under image property ==
            newCampsite.image = result.secure_url;
            // == add image's public_id to campsite object ==
            newCampsite.imageId = result.public_id;
            // == add author to campsite ==
            newCampsite.author = {
                id: req.user._id,
                username: req.user.username
            };
            // Create a new campsite and save to DB
            Campsite.create(newCampsite, function (err, newlyCreated) {
                if (err) {
                    console.log(err);
                } else {
                    //redirect back to campsites page
                    console.log(newlyCreated);
                    res.redirect("/campsites");
                }
            });
        });
    });
});

//NEW - show form to create new campsite
router.get("/new", isLoggedIn, function (req, res) {
    res.render("campsites/new");
});

// SHOW - shows more info about one campsite
router.get("/:id", function (req, res) {
    //find the campsite with provided ID
    Campsite.findById(req.params.id).populate("comments").exec(function (err, foundCampsite) {
        if (err) {
            console.log(err);
        } else {
            console.log(foundCampsite);
            //render show template with that campsite
            res.render("campsites/show", {
                campsite: foundCampsite
            });
        }
    });
});

// EDIT - shows edit form for a campsite
router.get("/:id/edit", isLoggedIn, checkUserCampsite, function (req, res) {
    console.log("IN EDIT!");
    //find the campsite with provided ID
    Campsite.findById(req.params.id, function (err, foundCampsite) {
        if (err) {
            console.log(err);
        } else {
            //render show template with that campsite
            res.render("campsites/edit", {
                campsite: foundCampsite
            });
        }
    });
});

router.put("/:id", upload.single('image'), function (req, res) {
    Campsite.findById(req.params.id, async function (err, campsite) {
        if (err) {
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            if (req.file) {
                try {
                    await cloudinary.v2.uploader.destroy(campsite.imageId);
                    let result = await cloudinary.v2.uploader.upload(req.file.path);
                    campsite.imageId = result.public_id;
                    campsite.image = result.secure_url;
                } catch (err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
            }
            campsite.name = req.body.name;
            campsite.cost = req.body.cost;
            campsite.description = req.body.description;
            campsite.save();
            req.flash("success", "Successfully Updated!");
            res.redirect("/campsites/" + campsite._id);
        }
    });
});

router.delete('/:id', function (req, res) {
    Campsite.findById(req.params.id, async function (err, campsite) {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        try {
            await cloudinary.v2.uploader.destroy(campsite.imageId);
            campsite.remove();
            req.flash('success', 'Campsite deleted successfully!');
            res.redirect('/campsites');
        } catch (err) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
        }
    });
});

module.exports = router;
