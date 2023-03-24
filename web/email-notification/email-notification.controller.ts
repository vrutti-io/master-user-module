import { NextFunction, Request, Response } from 'express';
import { BadRequestResponse, ConflictRequestResponse, SuccessResponse } from '../../../helpers/http';
import { decode } from '../../../helpers/jwt';
import models from '../../../models';
import { EmailNotificationService } from '../../services/email-notification.service';


export class EmailNotificationController {

    public async getEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { user } = res.locals;
            const get_address = await EmailNotificationService.getEmail(res.locals.project, user.account_id);
            return SuccessResponse(res, req.t('COMMON.OK'), get_address);
        } catch (err) {
            return next(err);
        }
    }

    public async addEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { body } = req;
            const { user } = res.locals;
            const payload = {
                account_id: user.account_id,
                created_by: user.user_id,
                ...body
            };
            const add_email = await EmailNotificationService.addEmail(res.locals.project, payload);
            if (add_email.code === 1)
                return SuccessResponse(res, req.t('EMAIL.CREATE_SUCCESS'), add_email.data);
            else if (add_email === 0) {
                return ConflictRequestResponse(res, req.t('EMAIL.ALREADY_EXIST'));
            }
        } catch (err) {
            return next(err);
        }
    }

    public async updateEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { body } = req;
            const { id } = req.params;
            const { user } = res.locals;
            const payload = {
                id: +id,
                account_id: user.account_id,
                modified_by: user.user_id,
                ...body
            };

            const update_email = await EmailNotificationService.updateEmail(res.locals.project, payload);
            if (update_email.code === 1) {
                return SuccessResponse(res, req.t('EMAIL.UPDATE_SUCCESS'), update_email.data);
            } else if (update_email === 0) {
                return BadRequestResponse(res, req.t('EMAIL.NOT_FOUND'));
            } else if (update_email === -1) {
                return ConflictRequestResponse(res, req.t('EMAIL.ALREADY_EXIST'));
            } else if (update_email === -2) {
                return ConflictRequestResponse(res, req.t('EMAIL.NO_CHANGE'));
            }
        } catch (err) {
            return next(err);
        }
    }

    public async updateEmailParams(req: Request, res: Response, next: NextFunction) {
        try {
            const { body } = req;
            const { id } = req.params;
            const { user } = res.locals;
            const payload = {
                id: +id,
                modified_by: user.user_id,
                ...body
            };

            const update_email = await EmailNotificationService.updateEmailParams(res.locals.project, payload);

            if (update_email.code === 1) {
                return SuccessResponse(res, req.t('EMAIL.UPDATE_SUCCESS'), update_email.data);
            } else if (update_email === 0) {
                return BadRequestResponse(res, req.t('EMAIL.NOT_FOUND'));
            }
        } catch (err) {
            return next(err);
        }
    }

    public async deleteEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { user } = res.locals;
            const payload = {
                id: +id,
                account_id: user.account_id,
            };

            const delete_email = await EmailNotificationService.deleteEmail(res.locals.project, payload);

            if (delete_email === -1) {
                return ConflictRequestResponse(res, req.t('EMAIL.CANT_DELETE'));
            } else if (delete_email === 1) {
                return SuccessResponse(res, req.t('EMAIL.DELETE_SUCCESS'));
            } else if (delete_email === 0) {
                return BadRequestResponse(res, req.t('EMAIL.NOT_FOUND'));
            }
        } catch (err) {
            return next(err);
        }
    }

    public async validateEmailSubscriptionToken(req: Request, res: Response, next: NextFunction) {
        try {
            const { query } = req;
            const decoded_data = decode(query.token);

            if (!decoded_data) return BadRequestResponse(res, req.t('EMAIL.INVALID_URL'));

            const EmailNotification = models[res.locals.project].tbl_email_notification;

            const check_email = await EmailNotification.findOne({
                where: {
                    email_address: decoded_data.email_address,
                    status: 1
                }
            });

            if (!check_email) return BadRequestResponse(res, req.t('EMAIL.INVALID_URL'));

            const response = {
                billing: check_email.billing,
                technical: check_email.technical,
                promotion: check_email.promotion,
            };

            return SuccessResponse(res, req.t('COMMON.OK'), response);
        } catch (err) {
            return next(err);
        }
    }

    public async updateEmailSubscription(req: Request, res: Response, next: NextFunction) {
        try {
            const EmailNotification = models[res.locals.project].tbl_email_notification;
            const { body } = req;
            const data = decode(body.token);

            const find_email = await EmailNotification.findOne({
                where: {
                    email_address: data.email_address,
                }
            });

            if (!find_email) return BadRequestResponse(res, req.t('EMAIL.NOT_FOUND'));

            await find_email.update({
                billing: body.billing,
                technical: body.technical,
                promotion: body.promotion,
            });

            return SuccessResponse(res, req.t('EMAIL.EMAIL_SETTING_UPDATED'));
        }
        catch (err) {
            return next(err);
        }
    }
}