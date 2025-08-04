const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
});

const teamSchema = new mongoose.Schema({
  creatorEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  creatorPhone: {
    type: String,
    required: true,
    trim: true,
  },
  teamName: {
    type: String,
    required: true,
    trim: true,
    unique: true, // enforce unique team names at DB level
  },
  members: {
    type: [memberSchema],
    validate: {
      validator: function (val) {
        return val.length <= 3;
      },
      message: "Team members exceed the limit of 3",
    },
    default: [], // default empty array if no members added
  },
});

module.exports = mongoose.model("Team", teamSchema);
