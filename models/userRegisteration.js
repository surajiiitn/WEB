const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  phone: String,
  age: Number,
  college: String,
  linkedin: String,
  country: String,
});

module.exports = mongoose.model("User", userSchema);
