import { Joi } from 'celebrate';

export const customerSchema = Joi.object({
    name: Joi.string().required(),
    email_address: Joi.string().email().required(),
    mobile_no: Joi.string(),
});

export const customerStatusSchema = Joi.object({
    status: Joi.string().valid('pending', 'active', 'suspend'),
});

export const sessionSchema = Joi.object({
    user_id: Joi.number().integer().required(),
});
