import Joi from "joi";

export const getFilesSchema = Joi.object({
    folder_id: Joi.string().required().allow(null, ''),
});