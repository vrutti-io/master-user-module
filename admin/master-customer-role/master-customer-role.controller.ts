import { NextFunction, Request, Response } from 'express';
import { BadRequestResponse, CannotDeleteResponse, ConflictRequestResponse, SuccessResponse } from '../../../helpers/http';
import models from '../../../models';

export class CustomerRoleController {
    public getAllCustomerRole = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const Customer_Role = models[res.locals.project].master_customer_role;
            const get_customer_role = await Customer_Role.findAll({ where: { status: 1 } });
            return SuccessResponse(res, req.t('COMMON.GET'), get_customer_role);
        } catch (err) {
            next(err);
        }
    };

    public createCustomerRole = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { user } = res.locals;
            const { body } = req;
            const Customer_Role = models[res.locals.project].master_customer_role;
            const modules = Object.keys(body.permission);

            const modules_validated = await validateModules(res.locals.project, modules);

            if (modules_validated) {

                const create_customer_role = await Customer_Role.findOrCreate({
                    where: {
                        name: body.name,
                    },
                    defaults: ({ ...body, created_by: user.user_id }),
                });

                if (create_customer_role[1]) {
                    return SuccessResponse(res, req.t('CUSTOMER_ROLE.CREATE_CUSTOMER_ROLE_SUCCESS'), create_customer_role[0]);
                } else {
                    return ConflictRequestResponse(res, req.t('CUSTOMER_ROLE.CREATE_CUSTOMER_ROLE_FAIL'));
                }
            } else {
                return BadRequestResponse(res, "Something went wrong. Please try again later");
            }

        } catch (err) {
            next(err);
        }
    };

    public updateCustomerRole = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { body } = req;
            const { user } = res.locals;
            const { id } = req.params;
            const CustomerRole = models[res.locals.project].master_customer_role;
            const modules = Object.keys(body.permission);

            const modules_validated = await validateModules(res.locals.project, modules);

            if (modules_validated) {

                const find_customer_role = await CustomerRole.findByPk(id);

                if (!find_customer_role) return BadRequestResponse(res, req.t('CUSTOMER_ROLE.CUSTOMER_ROLE_NOT_FOUND'));

                await find_customer_role.update({ ...body, modified_by: user.user_id, modified_time: new Date() });
                return SuccessResponse(res, req.t('CUSTOMER_ROLE.UPDATE_CUSTOMER_ROLE_SUCCESS'), find_customer_role);

            } else {
                return BadRequestResponse(res, "Something went wrong. Please try again later");
            }

        } catch (err) {
            next(err);
        }
    };

    public deleteCustomerRole = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { user } = res.locals;
            const CustomerRole = models[res.locals.project].master_customer_role;
            const UserInvite = models[res.locals.project].tbl_user_invite;
            const UserSetting = models[res.locals.project].tbl_user_setting;

            const find_customer_role = await CustomerRole.findByPk(id);
            const find_user_invite = await UserInvite.findOne({ where: { cu_role_id: id } });
            const find_user_setting = await UserSetting.findOne({ where: { cu_role_id: id } });

            if (!find_customer_role) return BadRequestResponse(res, req.t('CUSTOMER_ROLE.CUSTOMER_ROLE_NOT_FOUND'));

            if (find_user_invite || find_user_setting) {
                return CannotDeleteResponse(res, "This Record Can't Deleted, It Contain References to other data");
            } else {
                await find_customer_role.update({ status: 0, modified_by: user.user_id, modified_time: new Date() });
                return SuccessResponse(res, req.t('CUSTOMER_ROLE.DELETE_CUSTOMER_ROLE_SUCCESS'));
            }

        } catch (err) {
            next(err);
        }
    };
}

const validateModules = (project: string, modules: string[]) => {
    return new Promise(async (resolve) => {
        const CustomerModule = models[project].master_customer_module;
        for (let i = 0; i < modules.length; i++) {
            const findModule = await CustomerModule.findOne({ where: { key: modules[i] } });
            if (!findModule) {
                resolve(false);
                break;
            }
        }

        resolve(true);
    });
};