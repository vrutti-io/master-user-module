import { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import { BadRequestResponse, CannotDeleteResponse, ConflictRequestResponse, SuccessResponse } from '../../../helpers/http';
import models from '../../../models';

export class RoleController {
  public getAllRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = res.locals;
      const Role = models[res.locals.project].tbl_role;
      let role_search = {};
      const role = await Role.findByPk(user.role_id);
      if (role.same_level_edit) {
        role_search = {
          status: 1,
          level: {
            [Op.gte]: role.level
          },
          // role_category: 'admin'
        };
      } else if (role) {
        role_search = {
          status: 1,
          level: {
            [Op.gt]: role.level
          },
          // role_category: 'admin'
        };
      }
      const roles = await Role.findAll({
        where: role_search
      });
      return SuccessResponse(res, req.t('COMMON.GET'), roles);
    } catch (err) {
      next(err);
    }
  };

  public createRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const { user } = res.locals;
      const Role = models[res.locals.project].tbl_role;
      const create_role = await Role.findOrCreate({
        where: {
          name: body.name,
        },
        defaults: ({ ...body, created_by: user.user_id })
      });
      if (create_role[1]) {
        return SuccessResponse(res, req.t('ROLE.CREATE_ROLE_SUCCESS'), create_role[0]);
      } else {
        return ConflictRequestResponse(res, req.t('ROLE.CREATE_ROLE_FAIL'));
      }
    } catch (err) {
      next(err);
    }
  };

  public updateRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const { user } = res.locals;
      const { id } = req.params;
      const Role = models[res.locals.project].tbl_role;
      const role = await Role.findByPk(id);
      if (role) {
        await role.update({ ...body, ...{ modified_by: user.user_id, modified_time: new Date() } });
        return SuccessResponse(res, req.t('ROLE.UPDATE_ROLE_SUCCESS'), role);
      } else {
        return BadRequestResponse(res, req.t('ROLE.ROLE_NOT_FOUND'));
      }
    } catch (err) {
      next(err);
    }
  };

  public deleteRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { user } = res.locals;
      const Role = models[res.locals.project].tbl_role;
      const Permission = models[res.locals.project].tbl_permission;
      const permission = await Permission.findOne({ where: { role_id: id } });
      if (permission) return CannotDeleteResponse(res);
      const role = await Role.findByPk(id);
      if (role) {
        await role.update({ status: 0, modified_by: user.user_id, modified_time: new Date() });
        return SuccessResponse(res, req.t('ROLE.DELETE_ROLE_SUCCESS'));
      } else {
        return BadRequestResponse(res, req.t('ROLE.ROLE_NOT_FOUND'));
      }
    } catch (err) {
      next(err);
    }
  };
}
