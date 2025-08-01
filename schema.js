const Joi = require('joi');

const userRegistrationSchema = Joi.object({

    firstName: Joi.string().required().label("First Name"),
    lastName: Joi.string().required().label("Last Name"),
    email: Joi.string().email({ tlds: { allow: false } }).required().label("Email"),
    phone: Joi.number().required().label("Phone"),
    age: Joi.number().min(0).required().label("Age"),
    college: Joi.string().required().label("College"),
    linkedin: Joi.string().uri().required().label("LinkedIn Profile"),
    country: Joi.string().required().label("Country")
});

module.exports = userRegistrationSchema;
