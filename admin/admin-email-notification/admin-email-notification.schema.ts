
import { Joi } from 'celebrate';

export const adminAddEmailNotification = Joi.object({
    account_id: Joi.number().required(),
    email_address: Joi.string().email().required(),
    billing: Joi.number().required().valid(0, 1),
    technical: Joi.number().required().valid(0, 1),
    promotion: Joi.number().required().valid(0, 1),
});

export const adminUpdateEmailParam = Joi.object({
    billing: Joi.number().valid(0, 1),
    technical: Joi.number().valid(0, 1),
    promotion: Joi.number().valid(0, 1),
});
