const User = require("../models/userRegisteration");
const Team = require("../models/teamMember");
const { teamRegistrationSchema } = require("../schema");
const { setOtp, getOtp, deleteOtp } = require("../otpStore");
const transporter = require("../emailTransporter"); 
const { google } = require("googleapis");
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const fs = require("fs");
const path = require("path");

const credentials = fs.readFileSync(path.join(__dirname, "..", "credentials.json"));
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(credentials),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

module.exports = {
  renderTeamRegister(req, res) {
    res.render("listings/reg", { errorMessage: null, formData: {}, hideNavbar: true });
  },

  async handleTeamRegistration(req, res, next) {
    try {
      delete req.body.additionalCount;

      let members = req.body.members || [];
      if (!Array.isArray(members)) {
        members = [members];
      }

      // Clean and filter members
      members = members.filter(
        (m) =>
          m.firstName?.trim() &&
          m.lastName?.trim() &&
          m.email?.trim()
      ).map(m => ({
        firstName: m.firstName.trim(),
        lastName: m.lastName.trim(),
        email: m.email.trim().toLowerCase()
      }));

      req.body.members = members;
      req.body.creatorEmail = req.body.creatorEmail.trim().toLowerCase();

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

      // Check if creator or any member already belongs to a team
      const usersInTeams = await Team.find({
        $or: [
          { creatorEmail: { $in: [creatorEmail, ...memberEmails] } },
          { "members.email": { $in: [creatorEmail, ...memberEmails] } },
        ],
      });

      if (usersInTeams.length > 0) {
        return res.status(400).render("listings/reg", {
          errorMessage: "One or more users (leader or members) have already joined a team.",
          formData: req.body,
          hideNavbar: true,
          showTeamErrorPopup: true,
        });
      }

      const existingMembers = await User.find({ email: { $in: memberEmails } });
      if (existingMembers.length !== memberEmails.length) {
        return res.status(400).render("listings/reg", {
          errorMessage: "Some team members are not registered individually.",
          formData: req.body,
          hideNavbar: true,
        });
      }

      const otp = Math.floor(100000 + Math.random() * 900000);
      await setOtp(teamName, { otp, data: { creatorEmail, teamName, members } });

      // Send OTP emails to all members
      await Promise.all(
        members.map((member) =>
          transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: member.email,
            subject: "Team Registration OTP - Genathon 3.0",
            text: `Your team registration OTP is: ${otp}. It is valid for 5 minutes.`,
          })
        )
      );

      res.render("listings/enterTeamOtp", { teamName, hideNavbar: true });
    } catch (e) {
      next(e);
    }
  },

  async verifyTeamOtp(req, res, next) {
    try {
      const teamName = req.body.teamName;
      const otp = req.body.otp.trim();

      const record = await getOtp(teamName);

      if (!record) {
        throw new Error("OTP expired or invalid.");
      }

      if (record.otp.toString() !== otp) {
        throw new Error("Incorrect OTP.");
      }

      const { creatorEmail, teamName: savedTeamName, members } = record.data;

      const existing = await Team.findOne({ teamName: savedTeamName });
      if (existing) {
        await deleteOtp(teamName);
        return res.render("listings/teamSuccess", {
          teamName: savedTeamName,
          alreadyRegistered: true,
          hideNavbar: true,
        });
      }

      // Re-check here to ensure leader or members didn't join another team meanwhile
      const usersInTeams = await Team.find({
        $or: [
          { creatorEmail: { $in: [creatorEmail, ...members.map(m => m.email)] } },
          { "members.email": { $in: [creatorEmail, ...members.map(m => m.email)] } },
        ],
      });
      if (usersInTeams.length > 0) {
        await deleteOtp(teamName);
        return res.status(400).render("listings/reg", {
          errorMessage: "One or more users (leader or members) have already joined a team.",
          formData: { creatorEmail, teamName, members },
          hideNavbar: true,
        });
      }

      const creator = await User.findOne({ email: creatorEmail });
      if (!creator) {
        await deleteOtp(teamName);
        throw new Error("Creator email not found.");
      }

      const newTeam = new Team({
        creatorEmail,
        creatorPhone: creator.phone,
        teamName: savedTeamName,
        members,
      });

      try {
        await newTeam.save();
      } catch (err) {
        await deleteOtp(teamName);
        if (err.code === 11000 && err.keyPattern?.teamName) {
          return res.status(400).render("listings/reg", {
            errorMessage: "Team name already taken. Please choose another.",
            formData: { creatorEmail, teamName, members },
            hideNavbar: true,
          });
        }
        throw err;
      }

      const sheetValues = [savedTeamName, creatorEmail, creator.phone];
      for (const member of members) {
        sheetValues.push(member.email || "");
      }
      for (let i = members.length; i < 3; i++) {
        sheetValues.push("");
      }

      try {
        const client = await auth.getClient();
        await sheets.spreadsheets.values.append({
          auth: client,
          spreadsheetId: SPREADSHEET_ID,
          range: "Sheet2!A1",
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [sheetValues] },
        });
      } catch (sheetErr) {
        console.error("❌ Google Sheets Error:", sheetErr);
      }

      // Send confirmation email to all members
      await Promise.all(
        members.map((member) =>
          transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: member.email,
            subject: "Team Registration Successful - Genathon 3.0",
            text: `Hello,\n\nYour team "${savedTeamName}" has been successfully registered.\n\nBest regards,\nTeam Elevate`,
          })
        )
      );

      await deleteOtp(teamName);

      res.render("listings/teamSuccess", { teamName: savedTeamName, hideNavbar: true });
    } catch (e) {
      next(e);
    }
  },
};
