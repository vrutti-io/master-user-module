import { NextFunction, Request, Response } from 'express';
import models from '../../../models';
import { BadRequestResponse, SuccessResponse } from '../../../helpers/http';

export class AdminPermissionController {

  public getAllPermissionByRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role_id } = req.params;
      const Permission = models[res.locals.project].tbl_permission;
      const Module = models[res.locals.project].tbl_module;
      Permission.belongsTo(Module, { foreignKey: { name: 'module_id', allowNull: false } });
      const permission = await Permission.findAll({
        where: {
          role_id: role_id,
        },
        include: [
          {
            model: Module,
            attributes: ['name'],
          },
        ],
      });
      return SuccessResponse(res, req.t('COMMON.GET'), permission);
    } catch (err) {
      next(err);
    }
  };

  public getAllPermission = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const Permission = models[res.locals.project].tbl_permission;
      const Module = models[res.locals.project].tbl_module;
      Permission.belongsTo(Module, { foreignKey: { name: 'module_id', allowNull: false } });
      const permission = await Permission.findAll({
        where: {
          role_id: res.locals.user.role_id,
        },
        include: [
          {
            model: Module,
            attributes: ['name'],
          },
        ],
      });
      return SuccessResponse(res, req.t('COMMON.GET'), permission);
    } catch (err) {
      next(err);
    }
  };

  public changePermission = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const { user } = res.locals;
      const Permission = models[res.locals.project].tbl_permission;
      const permission = await Permission.findOne({
        where: {
          role_id: body.role_id,
          module_id: body.module_id,
        },
      });
      if (!permission) return BadRequestResponse(res, "Permission not found");
      if (permission) {
        await permission.update({ ...body, modified_by: user.user_id, modified_time: new Date() });
      } else {
        await Permission.create({ ...body, created_by: user.user_id });
      }
      return SuccessResponse(res, req.t('PERMISSION.CHANGE_PERMISSION_SUCCESS'), permission);
    } catch (err) {
      next(err);
    }
  };

  public changeAllPermission = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const { user } = res.locals;
      const Module = models[res.locals.project].tbl_module;
      const Permission = models[res.locals.project].tbl_permission;
      const Role = models[res.locals.project].tbl_role;
      const find_role = await Role.findOne({ where: { id: body.role_id } });
      if (find_role) {
        const module = await Module.findAll({
          attributes: ['id'],
        });
        for (let i = 0; i < module.length; i++) {
          const moduleId = await module[i].id;
          const obj: any = {
            role_id: +body.role_id,
            module_id: moduleId,
          };
          obj['permission_' + body.type] = body.value;
          const permission = await Permission.findOne({
            where: {
              role_id: obj.role_id,
              module_id: obj.module_id,
            },
          });
          if (permission) {
            await permission.update({ ...obj, ...{ modified_by: user.user_id, modified_time: new Date() } });
          } else {
            await Permission.create({ ...obj, ...{ created_by: user.user_id } });
          }
        }
        return SuccessResponse(res, req.t('PERMISSION.CHANGE_ALL_PERMISSION_SUCCESS'));
      } else {
        return BadRequestResponse(res, "Permission not found");
      }
    } catch (err) {
      next(err);
    }
  };

  public getPermissionByModule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = res.locals;
      const { module_name } = req.params;
      const Module = models[res.locals.project].tbl_module;
      const Permission = models[res.locals.project].tbl_permission;
      let response_obj = {
        read: 0,
        write: 0,
        update: 0,
        delete: 0,
      };
      const module = await Module.findOne({ where: { name: module_name } });
      if (!module) return BadRequestResponse(res, "Module not found");
      const permission = await Permission.findOne({
        where: {
          module_id: module.id,
          role_id: user.role_id,
        },
      });
      if (!permission) return BadRequestResponse(res, "Permission not found");
      response_obj = {
        read: permission.permission_read,
        write: permission.permission_write,
        update: permission.permission_update,
        delete: permission.permission_delete,
      };
      return SuccessResponse(res, req.t('COMMON.GET'), response_obj);
    } catch (err) {
      next(err);
    }
  };
}
