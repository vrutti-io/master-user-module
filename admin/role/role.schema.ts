import { Joi } from 'celebrate';

export const roleSchema = Joi.object({
  name: Joi.string().required(),
  level: Joi.number().optional(),
  same_level_edit: Joi.number().integer().valid(0, 1).optional(),
  role_category: Joi.string().valid('customer', 'admin', 'customer-role').required(),
  description: Joi.string().optional(),
});