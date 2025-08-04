const Joi = require("joi");

const userRegistrationSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .label("Phone"),
  age: Joi.number().required(),
  college: Joi.string().required(),
  linkedin: Joi.string().uri().required(),
  country: Joi.string().required(),
});

const teamRegistrationSchema = Joi.object({
  creatorEmail: Joi.string().email().required(),
  creatorPhone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .label("Creator Phone"),
  teamName: Joi.string().required(),

  members: Joi.array()
    .items(
      Joi.object({
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        email: Joi.string().email().required(),
      })
    )
    .min(1)
    .max(3)
    .required(),
});

module.exports = {
  userRegistrationSchema,
  teamRegistrationSchema,
};
