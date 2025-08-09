const mongoose = require("mongoose");

const toUpper = (value) => (typeof value === "string" ? value.toUpperCase() : value);

const memberSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
    set: toUpper,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    set: toUpper,
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
    unique: true,
    set: toUpper,
  },
  members: {
    type: [memberSchema],
    validate: {
      validator: function (val) {
        return val.length <= 3;
      },
      message: "Team members exceed the limit of 3",
    },
    default: [],
  },
});

module.exports = mongoose.model("Team", teamSchema);
