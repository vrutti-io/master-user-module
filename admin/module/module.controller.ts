import { NextFunction, Request, Response } from 'express';
import models from '../../../models';
import { BadRequestResponse, CannotDeleteResponse, ConflictRequestResponse, SuccessResponse } from '../../../helpers/http';

export class ModuleController {
  public getAllModule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const Module = models[res.locals.project].tbl_module;
      const module = await Module.findAll({ where: { status: 1 } });
      return SuccessResponse(res, req.t("COMMON.GET"), module);
    } catch (err) {
      next(err);
    }
  };

  public createModule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const { user } = res.locals;
      const Module = models[res.locals.project].tbl_module;
      const create_module = await Module.findOrCreate({
        where: {
          name: body.name,
        },
        defaults: ({ ...body, created_by: user.user_id }),
      });
      if (create_module[1]) {
        return SuccessResponse(res, req.t('MODULE.CREATE_MODULE_SUCCESS'), create_module[0]);
      } else {
        return ConflictRequestResponse(res, req.t('MODULE.CREATE_MODULE_FAIL'));
      }
    } catch (err) {
      next(err);
    }
  };

  public updateModule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const { user } = res.locals;
      const { id } = req.params;
      const Module = models[res.locals.project].tbl_module;
      const module = await Module.findByPk(id);
      if (module) {
        await module.update({ ...body, modified_by: user.user_id, modified_time: new Date() });
        return SuccessResponse(res, req.t('MODULE.UPDATE_MODULE_SUCCESS'), module);
      } else {
        return BadRequestResponse(res, req.t('MODULE.UPDATE_NOT_FOUND'));
      }
    } catch (err) {
      next(err);
    }
  };

  public deleteModule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { user } = res.locals;
      const Module = models[res.locals.project].tbl_module;
      const Permission = models[res.locals.project].tbl_permission;
      const permission = await Permission.findOne({ where: { module_id: id } });
      if (permission) return CannotDeleteResponse(res);
      const module = await Module.findByPk(id);
      if (module) {
        await module.update({ status: 0, modified_by: user.user_id, modified_time: new Date() });
        return SuccessResponse(res, req.t('MODULE.DELETE_MODULE_SUCCESS'));
      } else {
        return BadRequestResponse(res, req.t('MODULE.UPDATE_NOT_FOUND'));
      }
    } catch (err) {
      next(err);
    }
  };
}
