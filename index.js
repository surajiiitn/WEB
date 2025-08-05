const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const fs = require("fs");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const { otpEmailHtml, successEmailHtml } = require("./emailTemplates");

const User = require("./models/userRegisteration");
const Team = require("./models/teamMember");
const wrapAsync = require("./Utils/wrapAsync");
const ExpressError = require("./Utils/ExpressError");
const { userRegistrationSchema, teamRegistrationSchema } = require("./schema");

const app = express();

// -------------------- Database Connection --------------------`
mongoose
  .connect("mongodb://127.0.0.1:27017/elevate")
  .then(() => console.log("✅ Connected to database"))
  .catch((err) => console.log("❌ DB Error:", err));

// -------------------- App Configuration ----------------------
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// -------------------- Google Sheets Setup --------------------
const credentials = JSON.parse(
  fs.readFileSync(path.join(__dirname, "credentials.json"))
);
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = "1dPR9sjdyplriHKyPOkQzV-83MzGSgLZQFmAE8CGLP9w";

// -------------------- OTP In-Memory Store --------------------
const otpStore = new Map(); // { email or teamName: { otp, data, expiresAt } }

// -------------------- Nodemailer Setup --------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "elevatexyz92@gmail.com",
    pass: "kzta iinh btwa qirh", // Use env vars in production
  },
});

// -------------------- Routes --------------------

// Home Page - show navbar only here
app.get("/", (req, res) => {
  res.render("listings/home", { hideNavbar: false });
});

// User Registration: Submit form -> Send OTP
app.post(
  "/listings",
  wrapAsync(async (req, res, next) => {
    const { error } = userRegistrationSchema.validate(req.body);
    if (error)
      throw new ExpressError(400, error.details.map((el) => el.message).join(", "));

    const data = req.body;
    const email = data.email;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render("listings/success", {
        name: existingUser.firstName,
        email: existingUser.email,
        alreadyRegistered: true,
        hideNavbar: true,
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(email, { otp, data, expiresAt });

    await transporter.sendMail({
      from: "elevatexyz92@gmail.com",
      to: email,
      subject: "Your OTP for Genathon Registration",
      html: otpEmailHtml(otp),
    });

    res.render("listings/enterOtp", { email, hideNavbar: true });
  })
);

// Verify User OTP
app.post(
  "/listings/submit-otp",
  wrapAsync(async (req, res, next) => {
    const { email, otp } = req.body;
    const record = otpStore.get(email);

    if (!record || Date.now() > record.expiresAt) {
      return res.status(400).render("listings/error", {
        err: { message: "OTP expired or invalid." },
        hideNavbar: true,
      });
    }

    if (record.otp.toString() !== otp.trim()) {
      return res.status(400).render("listings/error", {
        err: { message: "Incorrect OTP." },
        hideNavbar: true,
      });
    }

    const data = record.data;

    // Normalize email
    data.email = data.email.trim().toLowerCase();

    const newUser = new User(data);

    try {
      // Attempt to save the user
      await newUser.save();
    } catch (err) {
      otpStore.delete(email); // Clear OTP even if failed

      // Handle duplicate key error
      if (err.code === 11000) {
        console.warn("⚠️ Duplicate registration attempt for:", data.email);
        return res.render("listings/success", {
          name: data.firstName,
          email: data.email,
          alreadyRegistered: true,
          hideNavbar: true,
        });
      }

      // Unknown DB error
      console.error("❌ Error saving user:", err);
      return res.status(500).render("listings/error", {
        err: { message: "Error saving registration. Please try again." },
        hideNavbar: true,
      });
    }

    // Append to Google Sheet (after save success)
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
    } catch (sheetErr) {
      console.error("❌ Google Sheets Error:", sheetErr);
      // You may notify admin or user optionally
    }

    // Send confirmation email only if user was saved
    try {
      await transporter.sendMail({
        from: "elevatexyz@gmail.com",
        to: data.email,
        subject: "Registration Successful - Genathon 3.0",
        html: successEmailHtml(data.firstName),
      });
    } catch (emailErr) {
      console.error("❌ Failed to send confirmation email:", emailErr);
      // Optional: Add retry logic or notify admin
    }

    otpStore.delete(email); // Remove OTP after successful save and email

    res.render("listings/success", {
      name: data.firstName,
      email: data.email,
      hideNavbar: true,
    });
  })
);

// Render Team Registration Page (hide navbar)
app.get("/team/register", (req, res) => {
  res.render("listings/reg", { errorMessage: null, formData: {}, hideNavbar: true });
});

// Handle team registration form submission
app.post(
  "/register/team",
  wrapAsync(async (req, res, next) => {
    delete req.body.additionalCount;

    let members = req.body.members || [];
    if (!Array.isArray(members)) {
      // If only one member is added, members may be object not array
      members = [members];
    }

    // Filter members BEFORE validation to remove empty member forms
    members = members.filter(
      (member) =>
        member.firstName?.trim() || member.lastName?.trim() || member.email?.trim()
    );

    req.body.members = members;

    const { error } = teamRegistrationSchema.validate(req.body);
    if (error) {
      return res.status(400).render("listings/reg", {
        errorMessage: error.details.map((el) => el.message).join(", "),
        formData: req.body,
        hideNavbar: true,
      });
    }

    const { creatorEmail, teamName } = req.body;

    const existingCreator = await User.findOne({ email: creatorEmail });
    if (!existingCreator) {
      return res.status(400).render("listings/reg", {
        errorMessage: "Creator email is not registered.",
        formData: req.body,
        hideNavbar: true,
      });
    }

    const memberEmails = members.map((m) => m.email);
    const existingMembers = await User.find({ email: { $in: memberEmails } });
    if (existingMembers.length !== memberEmails.length) {
      return res.status(400).render("listings/reg", {
        errorMessage: "Some team members are not registered individually.",
        formData: req.body,
        hideNavbar: true,
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(teamName, { otp, data: { creatorEmail, teamName, members }, expiresAt });

    for (const member of members) {
      if (member.email) {
        await transporter.sendMail({
          from: "elevatexyz92@gmail.com",
          to: member.email,
          subject: "Team Registration OTP - Genathon 3.0",
          text: `Your team registration OTP is: ${otp}. It is valid for 5 minutes.`,
        });
      }
    }

    res.render("listings/enterTeamOtp", { teamName, hideNavbar: true });
  })
);

// Verify Team OTP (hide navbar)
app.post(
  "/team/verify-otp",
  wrapAsync(async (req, res, next) => {
    const { teamName, otp } = req.body;
    const record = otpStore.get(teamName);

    if (!record || Date.now() > record.expiresAt)
      throw new ExpressError(400, "OTP expired or invalid.");
    if (record.otp.toString() !== otp.trim())
      throw new ExpressError(400, "Incorrect OTP.");

    const { creatorEmail, teamName: savedTeamName, members } = record.data;

    // Check if team name already exists (unique)
    const existing = await Team.findOne({ teamName: savedTeamName });
    if (existing) {
      otpStore.delete(teamName);
      return res.render("listings/teamSuccess", {
        teamName: savedTeamName,
        alreadyRegistered: true,
        hideNavbar: true,
      });
    }

    // Get creator phone number from User collection
    const creator = await User.findOne({ email: creatorEmail });
    if (!creator) {
      otpStore.delete(teamName);
      throw new ExpressError(400, "Creator email not found in users.");
    }

    const newTeam = new Team({
      creatorEmail,
      creatorPhone: creator.phone,
      teamName: savedTeamName,
      members,
    });

    try {
      await newTeam.save();
      console.log("✅ Team saved in MongoDB:", newTeam);
    } catch (err) {
      otpStore.delete(teamName);
      if (err.code === 11000 && err.keyPattern && err.keyPattern.teamName) {
        // Duplicate team name error
        return res.status(400).render("listings/reg", {
          errorMessage: "Team name already taken. Please choose another.",
          formData: req.body,
          hideNavbar: true,
        });
      }
      console.error("❌ MongoDB Save Error:", err);
      throw new ExpressError(500, "Database error saving team");
    }

    // Prepare data for Google Sheets
    const sheetValues = [savedTeamName, creatorEmail, creator.phone];
    for (const member of members) {
      sheetValues.push(member.email || "");
    }

    // Fill remaining member email slots (max 3 members)
    const missing = 3 - members.length;
    for (let i = 0; i < missing; i++) {
      sheetValues.push("");
    }

    try {
      const client = await auth.getClient();
      await sheets.spreadsheets.values.append({
        auth: client,
        spreadsheetId: SPREADSHEET_ID,
        range: "Sheet2!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [sheetValues],
        },
      });
      console.log("✅ Team appended to Google Sheets");
    } catch (sheetErr) {
      console.error("❌ Google Sheets Error:", sheetErr);
    }

    // Send confirmation emails to all team members
    for (const member of members) {
      if (member.email) {
        try {
          await transporter.sendMail({
            from: "elevatexyz92@gmail.com",
            to: member.email,
            subject: "Team Registration Successful - Genathon 3.0",
            text: `Hello,\n\nYour team "${savedTeamName}" has been successfully registered.\n\nBest regards,\nTeam Elevate`,
          });
        } catch (emailErr) {
          console.error(`❌ Failed to send mail to ${member.email}:`, emailErr);
        }
      }
    }

    otpStore.delete(teamName);
    res.render("listings/teamSuccess", { teamName: savedTeamName, hideNavbar: true });
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

// -------------------- Start Server ---------------------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
