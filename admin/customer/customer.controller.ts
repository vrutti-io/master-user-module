import { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import { pageLimit, pageOffset } from '../../../helpers/util';
import { BadRequestResponse, ConflictRequestResponse, SuccessResponse } from '../../../helpers/http';
import models from '../../../models';
import { UserService, } from '../../services/user.service';
import { CUSTOMER_CHILD_ROLE_ID, CUSTOMER_ROLE_ID } from '../../../config/constant.config';

export class CustomerController {
    public getAllCustomer = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { query } = req;
            const User = models[res.locals.project].tbl_user;
            const sequelize = models[res.locals.project].sequelize;
            const searchText = query.searchText;
            const search: any = {};
            search[Op.and] = [];
            search[Op.and].push({
                status: {
                    [Op.ne]: 'trash',
                },
                role_id: {
                    [Op.eq]: CUSTOMER_ROLE_ID
                }
            });
            if (searchText) {
                search[Op.or] = [];
                search[Op.or].push(sequelize.literal(`tbl_user.id like '%${searchText}%'`));
                search[Op.or].push(sequelize.literal(`tbl_user.mobile_no like '%${searchText}%'`));
                search[Op.or].push(sequelize.literal(`tbl_user.name like '%${searchText}%'`));
                search[Op.or].push(sequelize.literal(`tbl_user.email_address like '%${searchText}%'`));
            }
            const limit = pageLimit(query.pageSize);
            const offset = pageOffset(query.pageIndex, limit);
            let column = `id`,
                direction = `DESC`;
            if (query.sortColumn) column = query.sortColumn as string;
            if (query.sortDirection) direction = query.sortDirection as string;
            const orderBy = [column, direction];
            const users = await User.findAndCountAll({
                where: search,
                order: [orderBy],
                attributes: { exclude: ['password', 'social_auth_token',] },
                limit,
                offset,
            });
            return SuccessResponse(res, req.t('COMMON.GET'), users);
        } catch (err) {
            next(err);
        }
    };

    public updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { body } = req;
            const { id } = req.params;
            const User = models[res.locals.project].tbl_user;
            const find_user = await User.findByPk(id);
            if (find_user) {
                const update_user = await User.findOne({
                    where: {
                        email_address: body.email_address,
                        id: { [Op.ne]: id },
                    },
                });
                if (update_user) return ConflictRequestResponse(res, req.t('ADMIN_CUSTOMER.CUSTOMER_EXIST'));
                await find_user.update(body);
                return SuccessResponse(res, req.t('ADMIN_CUSTOMER.UPDATE_CUSTOMER_SUCCESS'), find_user);
            } else {
                return BadRequestResponse(res, req.t('ADMIN_CUSTOMER.CUSTOMER_NOT_FOUND'));
            }
        } catch (err) {
            next(err);
        }
    };

    public deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { user } = res.locals;
            await UserService.deleteUser(res.locals.project, +id, user.user_id);
            return SuccessResponse(res, req.t('ADMIN_CUSTOMER.DELETE_CUSTOMER_SUCCESS'));
        } catch (err) {
            next(err);
        }
    };

    public updateCustomerEmailVerification = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { user } = res.locals;
            await UserService.updateUserEmailVerification(res.locals.project, +id, 1, user.user_id);
            return SuccessResponse(res, req.t('ADMIN_CUSTOMER.UPDATE_CUSTOMER_EMAIL_SUCCESS'));
        } catch (err) {
            next(err);
        }
    };

    public updateCustomerMobileVerification = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { user } = res.locals;
            await UserService.updateUserMobileVerification(res.locals.project, +id, 1, user.user_id);
            return SuccessResponse(res, req.t('ADMIN_CUSTOMER.UPDATE_CUSTOMER_MOBILE_SUCCESS'));
        } catch (err) {
            next(err);
        }
    };

    public updateCustomerStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { body } = req;
            const { user } = res.locals;
            await UserService.updateUserStatus(res.locals.project, +id, body.status, user.user_id);
            return SuccessResponse(res, req.t('ADMIN_CUSTOMER.UPDATE_CUSTOMER_STATUS_SUCCESS'));
        } catch (err) {
            next(err);
        }
    };

    public getAllChildCustomer = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { account_id } = req.params;
            const User = models[res.locals.project].tbl_user;
            const find_child_user = await User.findAll({
                where: {
                    account_id: account_id,
                    role_id: CUSTOMER_CHILD_ROLE_ID,
                    status: {
                        [Op.ne]: 'trash'
                    }
                }
            });
            return SuccessResponse(res, req.t('COMMON.GET'), find_child_user);
        } catch (err) {
            next(err);
        }
    };

    public getAllUserSession = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { user_id } = req.query;
            const query = `SELECT id,user_id,login_method,device_type,device_browser_model,os_type,os_browser_version,app_version,login_time,last_active_time,auto_logout,1 as isActive,null as logout_time 
            FROM pcb_click.tbl_user_session 
            WHERE user_id = ${user_id} 
            UNION ALL
            SELECT id,user_id,login_method,device_type,device_browser_model,os_type,os_browser_version,app_version,login_time,last_active_time,auto_logout,0 as isActive,logout_time 
            FROM pcb_click.tbl_user_session_history
            WHERE user_id = ${user_id}`;

            const sequelize = models[res.locals.project].sequelize;
            const find_session = await sequelize.query(query, { type: sequelize.QueryTypes.SELECT });
            return SuccessResponse(res, req.t('COMMON.GET'), find_session);
        } catch (err) {
            next(err);
        }
    };


}
