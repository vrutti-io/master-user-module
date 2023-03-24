import { NextFunction, Request, Response } from "express";
import { BadRequestResponse, SuccessResponse } from "../../../helpers/http";
import models from "../../../models";

export class NotificationTemplateController {
    public getAllNotificationTemplate = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const NotificationTemplate = models[res.locals.project].tbl_notification_template;
            const notificationTemplate = await NotificationTemplate.findAll({ where: { status: 1 } });
            return SuccessResponse(res, req.t('COMMON.GET'), notificationTemplate);
        } catch (err) {
            next(err);
        }
    };

    public createNotificationTemplate = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { body } = req;
            const { user } = res.locals;
            const NotificationTemplate = models[res.locals.project].tbl_notification_template;
            const create_notification_template = await NotificationTemplate.findOrCreate({
                where: {
                    name: body.name,
                },
                defaults: ({ ...body, created_by: user.user_id }),
            });
            if (create_notification_template[1]) {
                return SuccessResponse(res, req.t('NOTIFICATION_TEMPLATE.CREATE_TEMPLATE_SUCCESS'));
            } else {
                return BadRequestResponse(res, req.t('NOTIFICATION_TEMPLATE.CREATE_TEMPLATE_FAIL'));
            }
        } catch (err) {
            next(err);
        }
    };

    public updateNotificationTemplate = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { body } = req;
            const { user } = res.locals;
            const NotificationTemplate = models[res.locals.project].tbl_notification_template;
            const find_notificationtemplate = await NotificationTemplate.findByPk(id);
            if (find_notificationtemplate) {
                const update_notificationTemplate = await NotificationTemplate.findOne({
                    where: {
                        id: id,
                    },
                });
                if (update_notificationTemplate) {
                    await update_notificationTemplate.update({ ...body, modified_by: user.user_id, modified_time: new Date() });
                    return SuccessResponse(res, req.t('NOTIFICATION_TEMPLATE.UPDATE_TEMPLATE_SUCCESS'));
                } else {
                    return BadRequestResponse(res, req.t('NOTIFICATION_TEMPLATE.NOTIFICATION_TEMPLATE_NOT_FOUND'));
                }
            }
        } catch (err) {
            next(err);
        }
    };

    public deleteNotificationTemplate = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { user } = res.locals;
            const NotificationTemplate = models[res.locals.project].tbl_notification_template;
            const find_notificationtemplate = await NotificationTemplate.findByPk(id);
            if (find_notificationtemplate) {
                await find_notificationtemplate.update({ status: 0, modified_by: user.user_id, modified_time: new Date() });
                return SuccessResponse(res, req.t('NOTIFICATION_TEMPLATE.DELETE_TEMPLATE_SUCCESS'));
            }
            return BadRequestResponse(res, req.t('NOTIFICATION_TEMPLATE.NOTIFICATION_TEMPLATE_NOT_FOUND'));
        } catch (err) {
            next(err);
        }
    };
}