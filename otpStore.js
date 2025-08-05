const redis = require("redis");
const client = redis.createClient({ url: process.env.REDIS_URL });

client.connect().catch(console.error);

const OTP_EXPIRE_SECONDS = 5 * 60; // 5 minutes

async function setOtp(key, otpData) {
  await client.setEx(key, OTP_EXPIRE_SECONDS, JSON.stringify(otpData));
}

async function getOtp(key) {
  const data = await client.get(key);
  if (!data) return null;
  return JSON.parse(data);
}

async function deleteOtp(key) {
  await client.del(key);
}

module.exports = { setOtp, getOtp, deleteOtp };
