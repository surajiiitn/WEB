const Joi = require('joi');

const userRegistrationSchema = Joi.object({

    firstName: Joi.string().required().label("First Name"),
    lastName: Joi.string().required().label("Last Name"),
    email: Joi.string().email({ tlds: { allow: false } }).required().label("Email"),
    phone: Joi.string()
    .pattern(/^\d{10}$/)
    .required()
    .label("Phone")
    .messages({
        'string.pattern.base': `"Phone" must be a 10-digit number`
    }),

    age: Joi.number().min(0).required().label("Age").min(12).max(28),
    college: Joi.string().required().label("College"),
    linkedin: Joi.string().uri().required().label("LinkedIn Profile"),
    country: Joi.string().required().label("Country")
});

module.exports = userRegistrationSchema;
