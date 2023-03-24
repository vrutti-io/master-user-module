import { Joi } from 'celebrate';

export const roleSchema = Joi.object({
  name: Joi.string().required(),
  level: Joi.number().required(),
  same_level_edit: Joi.number().integer().valid(0, 1).required(),
});
