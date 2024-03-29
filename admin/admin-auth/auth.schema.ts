import { Joi } from 'celebrate'

export const adminLoginSchema = Joi.object({
  email_address: Joi.string().email().required(),
  password: Joi.string().required(),
})
