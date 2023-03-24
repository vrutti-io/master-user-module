
import { Joi } from 'celebrate';

export const addEmailNotification = Joi.object({
    email_address: Joi.string().email().required(),
    billing: Joi.number().required().valid(0, 1),
    technical: Joi.number().required().valid(0, 1),
    promotion: Joi.number().required().valid(0, 1),
});

export const updateEmailParam = Joi.object({
    billing: Joi.number().valid(0, 1),
    technical: Joi.number().valid(0, 1),
    promotion: Joi.number().valid(0, 1),
});

export const validateTokenSchema = Joi.object({
    token: Joi.string().required(),
});

export const updateEmailSubscription = Joi.object({
    token: Joi.string().required(),
    billing: Joi.number().valid(0, 1),
    technical: Joi.number().valid(0, 1),
    promotion: Joi.number().valid(0, 1),
});