import { Request, Response, NextFunction } from "express";
import { SuccessResponse } from "../../../helpers/http";
import models from "../../../models";


export class PermissionController {

    public getAllPermissions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const UserSetting = models[res.locals.project].tbl_user_setting;
            const ActivePlan = models[res.locals.project].tbl_active_plan;

            const user_setting = await UserSetting.findOne({
                where: {
                    user_id: res.locals.user.user_id
                },
                attributes: ['cu_role_permission']
            });

            const active_plan = await ActivePlan.findOne({
                where: {
                    account_id: res.locals.user.account_id
                },
                attributes: ['lns_cnt', 'device_type_cnt', 'device_cnt']
            });

            const permission = user_setting?.cu_role_permission ?? null;
            const plan = active_plan ?? null;

            const data = {
                permission,
                plan
            }

            return SuccessResponse(res, req.t('COMMON.GET'), data);
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