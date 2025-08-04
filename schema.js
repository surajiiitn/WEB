const Joi = require("joi");

// User Registration Schema
const userRegistrationSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  age: Joi.number().required(),
  college: Joi.string().required(),
  linkedin: Joi.string().uri().required(),
  country: Joi.string().required(),
});

// Team Registration Schema (Allows optional member fields)


const teamRegistrationSchema = Joi.object({
  creatorEmail: Joi.string().email().required(),
  teamName: Joi.string().required(),
  members: Joi.array().items(
    Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      email: Joi.string().email().required(),
      phone: Joi.string().required(),
      linkedin: Joi.string().allow(""),
    })
  ).min(1).max(4),
});


module.exports = {
  userRegistrationSchema,
  teamRegistrationSchema,
};
