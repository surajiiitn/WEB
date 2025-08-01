const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const User = require("./models/userRegisteration");
const { google } = require("googleapis");
const fs = require("fs");
const nodemailer = require("nodemailer");

const wrapAsync = require("./Utils/wrapAsync");
const ExpressError = require("./Utils/ExpressError");
const userRegistrationSchema = require("./schema");

const app = express();

// -------------------- Database Connection --------------------
mongoose.connect("mongodb://127.0.0.1:27017/elevate")
  .then(() => console.log("✅ Connected to database"))
  .catch((err) => console.log("❌ DB Error:", err));

// -------------------- App Configuration ----------------------
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// -------------------- Google Sheets Setup --------------------
const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, "credentials.json")));
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = "1dPR9sjdyplriHKyPOkQzV-83MzGSgLZQFmAE8CGLP9w";

// -------------------- OTP In-Memory Store --------------------
const otpStore = new Map(); // { email: { otp, data, expiresAt } }

// -------------------- Nodemailer Setup --------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "elevatexyz92@gmail.com",
    pass: "kzta iinh btwa qirh",
  },
  logger: false,
  debug: false,
});

// -------------------- Routes --------------------
app.get("/", (req, res) => {
  res.render("listings/home");
});

// Submit form -> Send OTP
app.post(
  "/listings",
  wrapAsync(async (req, res, next) => {
    const { error } = userRegistrationSchema.validate(req.body);
    if (error) {
      const message = error.details.map((el) => el.message).join(", ");
      throw new ExpressError(400, message);
    }

    const data = req.body;
    const email = data.email;

    const otp = Math.floor(100000 + Math.random() * 900000);
    const expiresAt = Date.now() + 5 * 60 * 1000;

    otpStore.set(email, { otp, data, expiresAt });

    await transporter.sendMail({
      from: "elevatexyz92@gmail.com",
      to: email,
      subject: "Your OTP for Genathon Registration",
      text: `Your OTP is: ${otp}. It is valid for 5 minutes.`,
    });

    res.render("listings/enterOtp", { email });
  })
);

// Verify OTP -> Save to DB + Sheet
app.post(
  "/listings/submit-otp",
  wrapAsync(async (req, res, next) => {
    const { email, otp } = req.body;
    const record = otpStore.get(email);

    if (!record || Date.now() > record.expiresAt) {
      throw new ExpressError(400, "OTP expired or invalid.");
    }

    if (record.otp.toString() !== otp.trim()) {
      throw new ExpressError(400, "Incorrect OTP.");
    }

    const data = record.data;

    // Save to MongoDB
    try {
      const newUser = new User(data);
      await newUser.save();
    } catch (err) {
      if (err.code === 11000) {
        throw new ExpressError(400, "Email already registered.");
      }
      throw err;
    }

    // Save to Google Sheets — handle network error here
    try {
      const client = await auth.getClient();
      await sheets.spreadsheets.values.append({
        auth: client,
        spreadsheetId: SPREADSHEET_ID,
        range: "Sheet1!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              data.firstName,
              data.lastName,
              data.email,
              data.phone,
              data.age,
              data.college,
              data.linkedin,
              data.country,
            ],
          ],
        },
      });
    } catch (err) {
      if (
        err.code === "ENOTFOUND" ||
        (err.message && err.message.includes("getaddrinfo"))
      ) {
        return next(
          new ExpressError(
            503,
            "Cannot reach Google API right now. Please try again later."
          )
        );
      }
      throw err;
    }

    otpStore.delete(email);
    res.render("listings/success", { name: data.firstName, hideNavbar: true });
  })
);

// -------------------- Error Handling --------------------
app.all("*", (req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Something went wrong" } = err;
  res.status(statusCode).render("listings/error", {
    err,
    hideNavbar: true,
  });
});

// -------------------- Start Server --------------------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
