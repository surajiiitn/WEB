const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const User = require("./models/userRegisteration");
const {google} = require("googleapis");
const fs = require("fs");


const app = express();

// Data base connection 

main()
.then(console.log("Connected to database : "))
.catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/elevate');
}

app.engine("ejs", ejsMate); 
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); // for CSS/JS

const credentials = JSON.parse(fs.readFileSync("credentials.json")); // Make sure this file exists in the root

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = "1dPR9sjdyplriHKyPOkQzV-83MzGSgLZQFmAE8CGLP9w";

// Sample route
app.get("/", (req, res) => {
    res.render("listings/home.ejs");
});


app.post("/listings",async (req,res)=>{const data = req.body;

  try {
    // 1. Save to MongoDB
    const newUser = new User(data);
    await newUser.save();

    // 2. Save to Google Sheet
    const client = await auth.getClient();

    await sheets.spreadsheets.values.append({
      auth: client,
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A1", // or the exact name of your sheet tab if renamed
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          data.firstName || "",
          data.lastName || "",
          data.email || "",
          data.phone || "",
          data.age || "",
          data.college || "",
          data.linkedin || "",
          data.country || ""
        ]]
      }
    });

    res.render("success.ejs",{name : data.first});
  } catch (err) {
    res.status(500).send("Something went wrong");
  }


})

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});





