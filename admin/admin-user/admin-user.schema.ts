import { Joi } from 'celebrate';

export const userSchema = Joi.object({
  name: Joi.string().required(),
  email_address: Joi.string().email().required(),
  mobile_no: Joi.string(),
  password: Joi.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/).required().messages({
    'string.pattern.base': 'Password must contain at least one uppercase, one lowercase, one number, and one special character',
  }),
  confirm_password: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Confirm password must be the same as password',
  }),
  role_id: Joi.number().integer().required(),
});

export const userUpdateSchema = Joi.object({
  name: Joi.string().required(),
  email_address: Joi.string().email(),
  mobile_no: Joi.string(),
  role_id: Joi.number().integer().required(),
});

export const userPasswordchema = Joi.object({
  password: Joi.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/).required().messages({
    'string.pattern.base': 'Password must contain at least one uppercase, one lowercase, one number, and one special character',
  }),
  confirm_password: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Confirm password must be the same as password',
  }),
});

export const userStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'active', 'suspend'),
});
