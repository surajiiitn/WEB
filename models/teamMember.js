const mongoose = require("mongoose");

const teamMemberSchema = new mongoose.Schema({
  creatorEmail: String,
  teamName: String,
  members: [
    {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      linkedin: String,
    },
  ],
});

module.exports = mongoose.model("Team", teamMemberSchema);
