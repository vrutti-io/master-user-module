import { Request, Response, NextFunction } from "express";
import { SuccessResponse } from "../../../helpers/http";
import models from "../../../models";


export class PermissionController {

    public getAllPermissions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const UserSetting = models[res.locals.project].tbl_user_setting;
            console.log('UserSetting: ', UserSetting);

            const user_setting = await UserSetting.findOne({
                where: {
                    user_id: res.locals.user.user_id
                },
                attributes: ['cu_role_permission']
            });
            const permission = user_setting?.cu_role_permission ?? null;


            return SuccessResponse(res, req.t('COMMON.GET'), permission);
        } catch (err) {
            next(err);
        }
    };

    public getPermissionByModule = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const UserSetting = models[res.locals.project].tbl_user_setting;

            const user_setting = await UserSetting.findOne({
                where: {
                    user_id: res.locals.user.user_id
                },
                attributes: ['cu_role_permission']
            });
            const permission = user_setting?.cu_role_permission ?? null;
            const { module } = req.params;
            const module_permission = permission[module] ?? null;
            return SuccessResponse(res, req.t('COMMON.GET'), module_permission);
        } catch (err) {
            next(err);
        }
    };

}