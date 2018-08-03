const express = require("express");
const router  = express.Router({mergeParams: true});
const Campsite = require("../models/campsite");
const Comment = require("../models/comment");
const middleware = require("../middleware");
const { isLoggedIn, checkUserComment, isAdmin } = middleware;

//Comments New
router.get("/new", isLoggedIn, function(req, res){
    // find campsite by id
    console.log(req.params.id);
    Campsite.findById(req.params.id, function(err, campsite){
        if(err){
            console.log(err);
        } else {
             res.render("comments/new", {campsite: campsite});
        }
    })
});

//Comments Create
router.post("/", isLoggedIn, function(req, res){
   //lookup campsite using ID
   Campsite.findById(req.params.id, function(err, campsite){
       if(err){
           console.log(err);
           res.redirect("/campsites");
       } else {
        Comment.create(req.body.comment, function(err, comment){
           if(err){
               console.log(err);
           } else {
               //add username and id to comment
               comment.author.id = req.user._id;
               comment.author.username = req.user.username;
               //save comment
               comment.save();
               campsite.comments.push(comment);
               campsite.save();
               console.log(comment);
               req.flash('success', 'Created a comment!');
               res.redirect('/campsites/' + campsite._id);
           }
        });
       }
   });
});

router.get("/:commentId/edit", isLoggedIn, checkUserComment, function(req, res){
  res.render("comments/edit", {campsite_id: req.params.id, comment: req.comment});
});

router.put("/:commentId", isAdmin, function(req, res){
   Comment.findByIdAndUpdate(req.params.commentId, req.body.comment, function(err, comment){
       if(err){
          console.log(err);
           res.render("edit");
       } else {
           res.redirect("/campsites/" + req.params.id);
       }
   }); 
});

router.delete("/:commentId", isLoggedIn, checkUserComment, function(req, res){
  // find campsite, remove comment from comments array, delete comment in db
  Campsite.findByIdAndUpdate(req.params.id, {
    $pull: {
      comments: req.comment.id
    }
  }, function(err) {
    if(err){ 
        console.log(err)
        req.flash('error', err.message);
        res.redirect('/');
    } else {
        req.comment.remove(function(err) {
          if(err) {
            req.flash('error', err.message);
            return res.redirect('/');
          }
          req.flash('error', 'Comment deleted!');
          res.redirect("/campsites/" + req.params.id);
        });
    }
  });
});

module.exports = router;