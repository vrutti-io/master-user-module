import { Joi } from 'celebrate';

export const inviteUserSchema = Joi.object({
  email_address: Joi.string().email().required(),
  cu_role_id: Joi.number().required(),
  cu_role_permission: Joi.object().pattern(
    Joi.string(), Joi.object().keys({
      read: Joi.boolean(),
      write: Joi.boolean(),
      update: Joi.boolean(),
      delete: Joi.boolean(),
    })
  ).required()
});

export const acceptInvitationSchema = Joi.object({
  invitation_code: Joi.string().required(),
  name: Joi.string().required(),
  password: Joi.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/).required().messages({
    'string.pattern.base': 'Password must contain at least one uppercase, one lowercase, one number, and one special character',
  }),
  confirm_password: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Confirm password must be the same as password',
  }),
});

export const updateTeamRoleSchema = Joi.object({
  cu_role_id: Joi.number().required(),
  cu_role_permission: Joi.object().pattern(
    Joi.string(), Joi.object().keys({
      read: Joi.boolean(),
      write: Joi.boolean(),
      update: Joi.boolean(),
      delete: Joi.boolean(),
    })
  ).required()
});