import { Request, Response, NextFunction } from "express";
import { BadRequestResponse, SuccessResponse } from "../../../helpers/http";
import models from "../../../models";


export class PermissionController {

    public getAllPermissions = async (req: Request, res: Response, next: NextFunction) => {
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
                        where: {
                            category: 'customer',
                            status: 1,
                        },
                        attributes: ['name'],
                    },
                ],
            });
            return SuccessResponse(res, req.t('COMMON.GET'), permission);


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
            const module = await Module.findOne({ where: { name: module_name, category: 'customer' } });
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