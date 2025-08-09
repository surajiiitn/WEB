const mongoose = require("mongoose");

const toUpper = (value) => (typeof value === "string" ? value.toUpperCase() : value);

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true, set: toUpper },
  lastName: { type: String, required: true, trim: true, set: toUpper },
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  age: { type: Number, min: 0 },
  college: { type: String, trim: true, set: toUpper },
  linkedin: { type: String, trim: true },
  country: { type: String, trim: true, set: toUpper },
});

module.exports = mongoose.model("User", userSchema);
