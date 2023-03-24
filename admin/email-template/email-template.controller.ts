import { NextFunction, Request, Response } from "express";
import { BadRequestResponse, SuccessResponse } from "../../../helpers/http";
import models from "../../../models"; 3;
import { EmailService } from "../../../services/email.service";
import { emailTemplateCusromerWelocmeSchema, emailTemplateCustomerInviteSchema, emailTemplateVerifySchema } from "./email-template.schema";


export class EmailTemplateController {
    public getAllEmailTemplate = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const EmailTemplate = models[res.locals.project].tbl_email_template;
            const emailTemplate = await EmailTemplate.findAll({ where: { status: 1 } });
            return SuccessResponse(res, req.t('COMMOC.GET'), emailTemplate);
        } catch (err) {
            next(err);
        }
    };

    public updateEmailTemplate = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { user } = res.locals;
            const { body } = req;
            const EmailTemplate = models[res.locals.project].tbl_email_template;
            const find_emailtemplate = await EmailTemplate.findByPk(id);
            if (find_emailtemplate) {
                await find_emailtemplate.update({ ...body, modified_by: user.user_id, modified_time: new Date() });
                return SuccessResponse(res, req.t('EMAIL_TEMPLATE.UPDATE_TEMPLATE_SUCCESS'), find_emailtemplate);
            } else {
                return BadRequestResponse(res, req.t('EMAIL_TEMPLATE.EMAIL_TEMPLATE_NOT_FOUND'));
            }
        } catch (err) {
            next(err);
        }
    };

    public deleteEmailTemplate = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { user } = res.locals;
            const EmailTemplate = models[res.locals.project].tbl_email_template;
            const find_emailTemplate = await EmailTemplate.findByPk(id);
            if (find_emailTemplate) {
                await find_emailTemplate.update({ status: 0, modified_by: user.user_id, modified_time: new Date() });
                return SuccessResponse(res, req.t('EMAIL_TEMPLATE.DELETE_TEMPLATE_SUCCESS'));
            }
            return BadRequestResponse(res, req.t('EMAIL_TEMPLATE.EMAIL_TEMPLATE_NOT_FOUND'));
        } catch (err) {
            next(err);
        }
    };


    public testEmail = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { body } = req;
            const EmailTemplate = models[res.locals.project].tbl_email_template;
            const find_emailtemplate = await EmailTemplate.findByPk(id);
            if (!find_emailtemplate) return BadRequestResponse(res, req.t('EMAIL_TEMPLATE.EMAIL_TEMPLATE_NOT_FOUND'));
            const send_email = await sendTestEmail(find_emailtemplate.name, res.locals.project, body);
            if (send_email.success) {
                return SuccessResponse(res, send_email.message);
            } else {
                return BadRequestResponse(res, send_email.message);
            }
        } catch (err) {
            next(err);
        }
    };
}

const sendTestEmail = (email_service: string, project: string, body: any) => {
    return new Promise<any>(async (resolve, reject) => {
        try {
            switch (email_service) {
                case 'ses_email_verify':
                    const email_verify = bodyValidator(emailTemplateVerifySchema, body);
                    if (email_verify.success) {
                        const email_verify_payload = {
                            name: body.name,
                            email_address: body.email_address,
                            user_id: body.user_id,
                        };
                        EmailService.ses_email_verify(project, email_verify_payload);
                    }
                    resolve(email_verify);
                    break;
                case 'ses_customer_welcome':
                    const customer_welcome = bodyValidator(emailTemplateCusromerWelocmeSchema, body);
                    if (customer_welcome.success) {
                        const customer_welcome_payload = {
                            user_id: body.user_id,
                            email_address: body.email_address,
                            name: body.name,
                        };
                        EmailService.ses_customer_welcome(project, customer_welcome_payload);
                    }
                    resolve(customer_welcome);
                    break;
                case 'ses_forgot_password':
                    const forgot_password = bodyValidator(emailTemplateVerifySchema, body);
                    if (forgot_password.success) {
                        const forgot_password_payload = {
                            name: body.name,
                            email_address: body.email_address,
                            user_id: body.user_id,
                        };
                        EmailService.ses_forgot_password(project, forgot_password_payload);
                    }
                    resolve(forgot_password);
                    break;
                case 'ses_customer_invitation':
                    const customer_invitation = bodyValidator(emailTemplateCustomerInviteSchema, body);
                    if (customer_invitation.success) {
                        const customer_invitation_payload = {
                            invitation_code: body.invitation_code,
                            email_address: body.email_address,
                            invited_by: body.invited_by,
                        };
                        EmailService.ses_customer_invitation(project, customer_invitation_payload);
                    }
                    resolve(customer_invitation);
                    break;
                default:
                    return {};
            }
        } catch (err) {
            reject(err);
        }
    });
};

const bodyValidator = (schema: any, body: any) => {
    const result = schema.validate(body);
    if (result.error) {
        return {
            success: false,
            message: result.error.details[0].message,
        };
    } else {
        return {
            success: true,
            message: 'Email Sent Successfully',
        };
    }
}




