const Otp = require('../models/Otp');

// Save or update OTP for a key (email or teamName)
async function setOtp(key, value, ttlMinutes = 10) {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  // value should be { otp, data } where data is user/team info
  await Otp.findOneAndUpdate(
    { key },
    { otp: value.otp.toString(), data: value.data, expiresAt },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// Get OTP record for verification
async function getOtp(key) {
  const otpRecord = await Otp.findOne({ key });
  if (!otpRecord) return null;

  if (otpRecord.expiresAt < new Date()) {
    await Otp.deleteOne({ key });
    return null;
  }
  return { otp: otpRecord.otp, data: otpRecord.data };
}

// Delete OTP after verification or expiration
async function deleteOtp(key) {
  await Otp.deleteOne({ key });
}

module.exports = { setOtp, getOtp, deleteOtp };
