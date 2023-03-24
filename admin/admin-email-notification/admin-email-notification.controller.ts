import { NextFunction, Request, Response } from 'express';
import { BadRequestResponse, ConflictRequestResponse, SuccessResponse } from '../../../helpers/http';
import models from '../../../models';
import { EmailNotificationService } from '../../services/email-notification.service';


export class AdminEmailNotificationController {

    public async getEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { account_id } = req.params;
            const get_address = await EmailNotificationService.getEmail(res.locals.project, +account_id);
            if (get_address) {
                return SuccessResponse(res, req.t('COMMON.OK'), get_address);
            }
        } catch (err) {
            return next(err);
        }
    }

    public async addEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { body } = req;
            const { user } = res.locals;
            const payload = {
                account_id: body.account_id,
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
                account_id: body.account_id,
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
            const EmailNotification = models[res.locals.project].tbl_email_notification;

            const find_account_id = await EmailNotification.findByPk(id);

            const payload = {
                id: +id,
                account_id: find_account_id.account_id,
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
}