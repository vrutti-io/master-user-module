import { Joi } from 'celebrate';

export const changePermissionSchema = Joi.object({
  role_id: Joi.number().integer(),
  module_id: Joi.number().integer(),
  permission_read: Joi.number().integer().valid(0, 1),
  permission_write: Joi.number().integer().valid(0, 1),
  permission_update: Joi.number().integer().valid(0, 1),
  permission_delete: Joi.number().integer().valid(0, 1),
});

export const changeAllPermissionSchema = Joi.object({
  role_id: Joi.number().integer(),
  value: Joi.number().required().valid(0, 1),
  type: Joi.string().required().allow('create', 'read', 'update', 'delete'),
});
