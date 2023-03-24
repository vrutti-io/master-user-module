import { Joi } from "celebrate";

export const customerRoleSchema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    permission: Joi.object().pattern(
        Joi.string(), Joi.object().keys({
            read: Joi.boolean(),
            write: Joi.boolean(),
            update: Joi.boolean(),
            delete: Joi.boolean(),
        })
    )
});

