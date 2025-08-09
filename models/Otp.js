const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // email or teamName
  otp: { type: String, required: true },
  data: { type: Object }, // optional user or team data
  expiresAt: { type: Date, required: true },
});

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Otp", otpSchema);
