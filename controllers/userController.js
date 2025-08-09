const User = require("../models/userRegisteration");
const { userRegistrationSchema } = require("../schema");
const { otpEmailHtml, successEmailHtml } = require("../emailTemplates");
const { setOtp, getOtp, deleteOtp } = require("./otpController");
const transporter = require("../emailTransporter"); // Make sure path is correct
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
  renderHome(req, res) {
    res.render("listings/home", { hideNavbar: false });
  },

  async sendUserOtp(req, res, next) {
    try {
      const { error } = userRegistrationSchema.validate(req.body);
      if (error) {
        throw new Error(error.details.map((el) => el.message).join(", "));
      }

      const data = { ...req.body };
      data.email = data.email.trim().toLowerCase();

      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        return res.render("listings/success", {
          name: existingUser.firstName,
          email: existingUser.email,
          alreadyRegistered: true,
          hideNavbar: true,
        });
      }

      const otp = Math.floor(100000 + Math.random() * 900000);
      await setOtp(data.email, { otp, data });

      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: data.email,
        subject: "Your OTP for Genathon Registration",
        html: otpEmailHtml(otp),
      });

      res.render("listings/enterOtp", { email: data.email, hideNavbar: true });
    } catch (e) {
      next(e);
    }
  },

  async verifyUserOtp(req, res, next) {
    try {
      const email = req.body.email.trim().toLowerCase();
      const otp = req.body.otp.trim();

      const record = await getOtp(email);

      if (!record) {
        return res.status(400).render("listings/error", {
          err: { message: "OTP expired or invalid." },
          hideNavbar: true,
        });
      }

      if (record.otp.toString() !== otp) {
        return res.status(400).render("listings/error", {
          err: { message: "Incorrect OTP." },
          hideNavbar: true,
        });
      }

      const data = record.data;
      const newUser = new User(data);

      try {
        await newUser.save();
      } catch (err) {
        await deleteOtp(email);

        if (err.code === 11000) {
          // Duplicate key error (email already registered)
          return res.render("listings/success", {
            name: data.firstName,
            email: data.email,
            alreadyRegistered: true,
            hideNavbar: true,
          });
        }

        return res.status(500).render("listings/error", {
          err: { message: "Error saving registration. Please try again." },
          hideNavbar: true,
        });
      }

      // Append to Google Sheets
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
      }

      // Send confirmation email
      try {
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: data.email,
          subject: "Registration Successful - Genathon 3.0",
          html: successEmailHtml(data.firstName),
        });
      } catch (emailErr) {
        console.error("❌ Failed to send confirmation email:", emailErr);
      }

      await deleteOtp(email);

      res.render("listings/success", {
        name: data.firstName,
        email: data.email,
        hideNavbar: true,
      });
    } catch (e) {
      next(e);
    }
  },
};
