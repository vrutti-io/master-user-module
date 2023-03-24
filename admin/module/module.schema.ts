import { Joi } from 'celebrate'

export const moduleSchema = Joi.object({
  name: Joi.string().required(),
})
