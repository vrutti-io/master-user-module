import { Joi } from 'celebrate';

export const loginSchema = Joi.object({
  email_address: Joi.string().email().required(),
  password: Joi.string().required(),
  login_method: Joi.string().valid('email', 'google', 'github', 'linkedin', 'twitter', 'microsoft').required(),
  fcm_token: Joi.string().allow(null, ''),
  device_udid: Joi.string().required(),
  device_type: Joi.string().allow(null, ''),
  device_browser_model: Joi.string().allow(null, ''),
  os_type: Joi.string().required().valid('android', 'ios', 'windows', 'mac', 'linux'),
  os_browser_version: Joi.string().allow(null, ''),
  app_version: Joi.string().allow(null, ''),
  fpjs_key: Joi.string().required()
});

export const registerSchema = Joi.object({
  email_address: Joi.string().email().required(),
  // one number, one uppercase, one lowercase, one special character, and at least 8 characters
  password: Joi.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/).required().messages({
    'string.pattern.base': 'Password must contain at least one uppercase, one lowercase, one number, and one special character',
  }),
  confirm_password: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Confirm password must be the same as password',
  }),
  name: Joi.string().required(),
  recaptcha_token: Joi.string().required(),
});

export const forgotPasswordSchema = Joi.object({
  email_address: Joi.string().email().required(),
  recaptcha_token: Joi.string().required(),
});

export const resetPasswordSchema = Joi.object({
  password: Joi.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/).required().messages({
    'string.pattern.base': 'Password must contain at least one uppercase, one lowercase, one number, and one special character',
  }),
  confirm_password: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Confirm password must be the same as password',
  }),
  code: Joi.string().required(),
});

export const changePasswordSchema = Joi.object({
  is_social_login: Joi.number().required().valid(0, 1),
  // if is_social_login is 0, then old_password is required
  old_password: Joi.string().when('is_social_login', {
    is: 0,
    then: Joi.string().required(),
  }),
  password: Joi.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/).required().messages({
    'string.pattern.base': 'Password must contain at least one uppercase, one lowercase, one number, and one special character',
  }),
  confirm_password: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Confirm password must be the same as password',
  }),
});

export const socailLoginSchema = Joi.object({
  email_address: Joi.string().email().required(),
  name: Joi.string().required(),
  verify_token: Joi.string().required(),
  social_auth_token: Joi.string().required(),
  social_auth_type: Joi.string().valid('email', 'google', 'github', 'linkedin', 'twitter', 'microsoft').required(),
  login_method: Joi.string().valid('email', 'google', 'github', 'linkedin', 'twitter', 'microsoft').required(),
  fcm_token: Joi.string().allow(null, ''),
  device_udid: Joi.string().required(),
  device_type: Joi.string().allow(null, ''),
  device_browser_model: Joi.string().allow(null, ''),
  os_type: Joi.string().required().valid('android', 'ios', 'windows', 'mac', 'linux'),
  os_browser_version: Joi.string().allow(null, ''),
  app_version: Joi.string().allow(null, ''),
  fpjs_key: Joi.string().required()
});