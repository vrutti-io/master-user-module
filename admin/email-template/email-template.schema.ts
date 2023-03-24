import { Joi } from "celebrate";

export const emailTemplateSchema = Joi.object({
    name: Joi.string(),
    subject: Joi.string()
});

export const emailTemplateVerifySchema = Joi.object({
    name: Joi.string().required(),
    email_address: Joi.string().required(),
});

export const emailTemplateCusromerWelocmeSchema = Joi.object({
    name: Joi.string().required(),
    email_address: Joi.string().required(),
});
export const emailTemplateCustomerInviteSchema = Joi.object({
    invitation_code: Joi.string().required(),
    email_address: Joi.string().required(),
    invited_by: Joi.string().required(),
})

