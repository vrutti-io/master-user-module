import { Joi } from 'celebrate';


export const updateProfile = Joi.object({
  name: Joi.string().required(),
  mobile_no: Joi.string().required(),
  lang: Joi.string().required(),
});

export const updateEmailSchema = Joi.object({
  email_address: Joi.string().email().required(),
});

export const verifyOTPSchema = Joi.object({
  otp: Joi.string().required().min(6).max(6),
});