const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const fs = require("fs");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const User = require("./models/userRegisteration");
const Team = require("./models/teamMember");
const wrapAsync = require("./Utils/wrapAsync");
const ExpressError = require("./Utils/ExpressError");
const { userRegistrationSchema, teamRegistrationSchema } = require("./schema");

const app = express();

// -------------------- Database Connection --------------------
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
    pass: "kzta iinh btwa qirh", // use environment variables for production
  },
});

// -------------------- Routes --------------------

// Home Page
app.get("/", (req, res) => {
  res.render("listings/home");
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
      });
    }

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

// Verify User OTP
app.post(
  "/listings/submit-otp",
  wrapAsync(async (req, res, next) => {
    const { email, otp } = req.body;
    const record = otpStore.get(email);

    if (!record || Date.now() > record.expiresAt)
      throw new ExpressError(400, "OTP expired or invalid.");
    if (record.otp.toString() !== otp.trim())
      throw new ExpressError(400, "Incorrect OTP.");

    const data = record.data;
    const newUser = new User(data);
    await newUser.save();

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

    await transporter.sendMail({
      from: "elevatexyz92@gmail.com",
      to: data.email,
      subject: "Registration Successful - Genathon 3.0",
      html: `<p>Hello ${data.firstName},</p><p>Thank you for registering for Genathon 3.0!</p><p><a href="https://chat.whatsapp.com/GnBtWJ7BQJg0TS2daI9rPO?mode=ac_t">Join WhatsApp Group</a></p><p>Best regards,<br>Team Elevate</p>`,
    });

    otpStore.delete(email);
    res.render("listings/success", { name: data.firstName, email: data.email });
  })
);

// Render Team Registration Page
app.get("/team/register", (req, res) => {
  res.render("listings/reg");
});

// Handle team registration form submission
app.post(
  "/register/team",
  wrapAsync(async (req, res, next) => {
    delete req.body.additionalCount;
    let members = req.body.members || [];

    // ✅ Filter members BEFORE validation
    members = members.filter(member => {
      return (
        member.firstName?.trim() ||
        member.lastName?.trim() ||
        member.email?.trim() ||
        member.phone?.trim() ||
        member.linkedin?.trim()
      );
    });

    req.body.members = members;

    const { error } = teamRegistrationSchema.validate(req.body);
    if (error)
      throw new ExpressError(400, error.details.map((el) => el.message).join(", "));

    const { creatorEmail, teamName } = req.body;

    const existingCreator = await User.findOne({ email: creatorEmail });
    if (!existingCreator)
      throw new ExpressError(400, "Creator email is not registered.");

    const memberEmails = members.map((m) => m.email);
    const existingMembers = await User.find({ email: { $in: memberEmails } });
    if (existingMembers.length !== memberEmails.length) {
      throw new ExpressError(400, "Some team members are not registered individually.");
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(teamName, { otp, data: { creatorEmail, teamName, members }, expiresAt });

    for (const member of members) {
      await transporter.sendMail({
        from: "elevatexyz92@gmail.com",
        to: member.email,
        subject: "Team Registration OTP - Genathon 3.0",
        text: `Your team registration OTP is: ${otp}. It is valid for 5 minutes.`,
      });
    }

    res.render("listings/enterTeamOtp", { teamName });
  })
);

// Verify Team OTP
app.post(
  "/team/verify-otp",
  wrapAsync(async (req, res, next) => {
    const { teamName, otp } = req.body;
    const record = otpStore.get(teamName);

    // 1. Validate OTP
    if (!record || Date.now() > record.expiresAt)
      throw new ExpressError(400, "OTP expired or invalid.");
    if (record.otp.toString() !== otp.trim())
      throw new ExpressError(400, "Incorrect OTP.");

    const { creatorEmail, teamName: savedTeamName, members } = record.data;

    // 2. Check if team name already exists
    const existing = await Team.findOne({ teamName: savedTeamName });
    if (existing) {
      otpStore.delete(teamName); // clear OTP to avoid reuse
      return res.render("listings/teamSuccess", {
        teamName: savedTeamName,
        alreadyRegistered: true,
      });
    }

    // 3. Save team data to MongoDB
    const newTeam = new Team({
      creatorEmail,
      teamName: savedTeamName,
      members,
    });

    try {
      await newTeam.save();
      console.log("✅ Team saved in MongoDB:", newTeam);
    } catch (err) {
      console.error("❌ MongoDB Save Error:", err);
      otpStore.delete(teamName); // clean up even if failed
      throw new ExpressError(500, "Database error saving team");
    }

    // 4. Prepare data for Google Sheets
    const sheetValues = [savedTeamName, creatorEmail];
    for (const member of members) {
      sheetValues.push(member.email || "");
      sheetValues.push(member.phone || "");
    }

    // Fill remaining slots if fewer than 4 members
    const missing = 4 - members.length;
    for (let i = 0; i < missing; i++) {
      sheetValues.push("");
      sheetValues.push("");
    }

    // 5. Append data to Google Sheets
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
      // Don't throw to avoid breaking confirmation emails
    }

    // 6. Send confirmation emails to all team members
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

    // 7. Clean up OTP store and render success
    otpStore.delete(teamName);
    res.render("listings/teamSuccess", { teamName: savedTeamName });
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