import { Joi } from "celebrate";

export const notificationTemplateSchema = Joi.object({
    name: Joi.string(),
    title: Joi.string(),
    message: Joi.string()
});