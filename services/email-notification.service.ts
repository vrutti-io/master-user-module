import { Op } from "sequelize";
import { AddEmailPayload, DeleteEmailPayload, UpdateEmailParamsPayload, UpdateEmailPayload } from "../../interface/email-notification.interface";
import models from "../../models";

export class EmailNotificationService {
    public static getEmail = async (project: string, account_id: number) => {
        return new Promise<any>(async (resolve, reject) => {
            try {
                const EmailNotification = models[project].tbl_email_notification;

                const get_email = await EmailNotification.findAll({
                    where: {
                        account_id: +account_id,
                        status: 1
                    },
                    attributes: ['id', 'email_address', 'billing', 'technical', 'promotion']
                });
                if (get_email)
                    resolve(get_email);
            } catch (err) {
                reject(err);
            }
        });
    };

    public static addEmail = async (project: string, payload: AddEmailPayload) => {
        return new Promise<any>(async (resolve, reject) => {
            try {
                const EmailNotification = models[project].tbl_email_notification;

                const add_email = await EmailNotification.findOrCreate({
                    where: {
                        account_id: payload.account_id,
                        email_address: payload.email_address
                    },
                    defaults: payload
                });
                const response = {
                    code: 1,
                    data: add_email[0]
                };
                if (add_email[1]) {
                    return resolve(response);
                } else {
                    return resolve(0);
                }
            } catch (err) {
                reject(err);
            }
        });
    };

    public static updateEmail = async (project: string, payload: UpdateEmailPayload) => {
        return new Promise<any>(async (resolve, reject) => {
            try {
                const EmailNotification = models[project].tbl_email_notification;

                const find_email = await EmailNotification.findByPk(payload.id);
                if (find_email) {
                    const find_user = await this.findUser(project, find_email.email_address, payload.account_id);
                    if (find_user) return resolve(-2);

                    const update_user = await EmailNotification.findOne({
                        where: {
                            account_id: payload.account_id,
                            email_address: payload.email_address,
                            id: { [Op.ne]: payload.id },
                        },
                    });
                    if (update_user) resolve(-1);

                    payload.modified_time = new Date();
                    const update_email = await find_email.update(payload);

                    const response = {
                        code: 1,
                        data: update_email
                    };

                    return resolve(response);
                } else {
                    return resolve(0);
                }
            } catch (err) {
                reject(err);
            }
        });
    };

    public static updateEmailParams = async (project: string, payload: UpdateEmailParamsPayload) => {
        return new Promise<any>(async (resolve, reject) => {
            try {
                const EmailNotification = models[project].tbl_email_notification;

                const find_email = await EmailNotification.findByPk(payload.id);
                if (find_email) {

                    payload.modified_time = new Date();
                    const update_email = await find_email.update(payload);

                    const response = {
                        code: 1,
                        data: update_email
                    };
                    return resolve(response);
                } else {
                    return resolve(0);
                }
            } catch (err) {
                reject(err);
            }
        });
    };

    public static deleteEmail = async (project: string, payload: DeleteEmailPayload) => {
        return new Promise<any>(async (resolve, reject) => {
            try {
                const EmailNotification = models[project].tbl_email_notification;

                const delete_email = await EmailNotification.findByPk(payload.id);
                if (delete_email) {
                    const find_user = await this.findUser(project, delete_email.email_address, payload.account_id);
                    if (find_user) return resolve(-1);

                    await delete_email.update({ status: 0, email_address: delete_email.email_address.concat('_deleted') });
                    return resolve(1);
                } else {
                    resolve(0);
                }
            } catch (err) {
                reject(err);
            }
        });
    };

    private static findUser = async (project: string, email_address: string, account_id: number) => {
        return new Promise<any>(async (resolve, reject) => {
            try {
                const User = models[project].tbl_user;

                const find_user = await User.findOne({
                    where: {
                        account_id: account_id,
                        email_address: email_address,
                        status: 'active'
                    }
                });
                if (find_user) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            } catch (err) {
                reject(err);
            }
        });
    };
}