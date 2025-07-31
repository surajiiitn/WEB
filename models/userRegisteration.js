const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userRegistration = new Schema({
    firstName : {
        type : String,
        required : true
    },
    lastName : {
        type : String,
        required : true
    },
    email : {
        type : String,
        required : true,
        unique : true ,
        lowercase : true,
        trim: true,
        match: [/\S+@\S+\.\S+/, "Please use a valid email address"]
    },
    phone : {
        type : Number,
        required : true
    },
    age : {
        type : Number,
        required : true
    },
    college : {
        type : String,
        required : true
    },
    linkedin : {
        type : String,
        required : true
    },
    country : {
        type : String,
        required : true
    }       
} 
);


const User = mongoose.model("User",userRegistration);

module.exports = User;