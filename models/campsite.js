const mongoose = require("mongoose");

// == SETUP SCHEMA ==
const campsiteSchema = new mongoose.Schema({
   name: String,
   image: String,
   imageId: String,
   description: String,
   cost: Number,
   location: String,
   lat: Number,
   lng: Number,
   createdAt: { type: Date, default: Date.now },
   author: {
      id: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User"
      },
      username: String
   },
   comments: [
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Comment"
      }
   ]
});



// == COMPILE SCHEMA INTO A MODEL ==
module.exports = mongoose.model("Campsite", campsiteSchema);