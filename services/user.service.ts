import { CUSTOMER_CHILD_ROLE_ID, CUSTOMER_ROLE_ID } from '../../config/constant.config';
import { loginToken } from '../../helpers/util';
import { DecodeToken } from '../../interface/auth.interface';
import { UpdateUserToken, User } from '../../interface/user.interface';
import { UserStatus } from '../../interface/user.interface';
import models from '../../models';
export class UserService {

    public static updateUserStatus(project: string, user_id: number, status: UserStatus, modified_by?: any) {
        return new Promise<User>(async (resolve, reject) => {
            try {
                const User = models[project].tbl_user;
                const find_user = await User.findOne({
                    where: {
                        id: user_id,
                    },
                });
                if (find_user) {
                    if ((status === "suspend" || "active")) {
                        if (find_user.role_id === CUSTOMER_ROLE_ID) {
                            const find_customer_child = await User.findAll({
                                where: {
                                    account_id: find_user.account_id,
                                }
                            }
                            );
                            if (find_customer_child) {
                                for (const user of find_customer_child) {
                                    await user.update({
                                        status: status, modified_by: modified_by, modified_time: new Date()
                                    });
                                }
                            }
                        }
                        if (find_user.role_id === CUSTOMER_CHILD_ROLE_ID) {
                            await find_user.update({
                                status: status, modified_by: modified_by, modified_time: new Date()
                            });
                        }
                    } else {
                        await find_user.update({
                            status: status, modified_by: modified_by, modified_time: new Date()
                        });
                    }
                    return resolve(find_user);
                }
                return reject(new Error('User not found'));
            } catch (err) {
                reject(err);
            }
        });
    }

    public static deleteUser(project: string, delete_user_id: number, modified_by: number) {
        return new Promise<number>(async (resolve, reject) => {
            try {

                if (!delete_user_id) return reject('User id is required');

                const User = models[project].tbl_user;
                const is_user_delete_able = await isUserDeleteAble(project, delete_user_id);
                if (is_user_delete_able) {
                    const find_user = await User.findOne({
                        where: {
                            id: delete_user_id,
                        },
                    });
                    if (find_user) {
                        await find_user.update({
                            status: 'trash',
                            email_address: find_user.email_address.concat('_deleted'),
                            modified_by: modified_by,
                            modified_time: new Date()
                        });
                    }
                    if ((find_user.role_id === CUSTOMER_ROLE_ID || find_user.role_id === CUSTOMER_CHILD_ROLE_ID)) {
                        await deleteUserSession(project, find_user);

                        if (find_user.role_id === CUSTOMER_ROLE_ID) {
                            await deleteCustomerOwner(project, find_user);
                        }
                        if (find_user.role_id === CUSTOMER_CHILD_ROLE_ID) {
                            await deleteCustomerChild(project, find_user);
                        }
                    }
                    return resolve(1);
                }
                return resolve(0);
            } catch (err) {
                reject(err);
            }
        });
    }

    public static updateUserEmailVerification(project: string, user_id: number, email_verified: number, modified_by?: number) {
        return new Promise<User>(async (resolve, reject) => {
            try {
                const User = models[project].tbl_user;
                const find_user = await User.findOne({
                    where: {
                        id: user_id,
                    },
                });
                if (find_user) {
                    await find_user.update({
                        email_verified: email_verified,
                        status: 'active',
                        modified_by: modified_by,
                        modified_time: new Date()
                    });
                }
                resolve(find_user);
            } catch (err) {
                reject(err);
            }
        });
    }

    public static updateUserMobileVerification(project: string, user_id: number, mobile_verified: number, modified_by?: number) {
        return new Promise<User>(async (resolve, reject) => {
            try {
                const User = models[project].tbl_user;
                const find_user = await User.findOne({
                    where: {
                        id: user_id,
                    },
                });
                if (find_user) {
                    await find_user.update({
                        mobile_verified: mobile_verified,
                        modified_by: modified_by,
                        modified_time: new Date()
                    });
                }
                resolve(find_user);
            } catch (err) {
                reject(err);
            }
        });
    }

    public static addEmailForNotification(project: string, user_id: number) {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                const User = models[project].tbl_user;
                const EmailNotification = models[project].tbl_email_notification;
                const find_user = await User.findOne({
                    where: {
                        id: user_id,
                    }
                });
                if (find_user) {
                    await EmailNotification.create({
                        account_id: find_user.account_id,
                        email_address: find_user.email_address,
                        created_by: find_user.id,
                    });
                }
                resolve(true);
            } catch (err) {
                reject(err);
            }
        });
    }

    public static updateUserToken(project: string, payload: UpdateUserToken) {
        return new Promise<string>(async (resolve, reject) => {
            try {
                const UserSession = models[project].tbl_user_session;

                const token = loginToken({
                    id: payload.id,
                    name: payload.name ?? '',
                    email_address: payload.email_address,
                    role_id: payload.role_id,
                    project: project,
                    account_id: payload.account_id,
                    session_id: payload.session_id,
                    customer_role_id: payload.customer_role_id,
                }, 'web',);

                const find_user_session = await UserSession.findOne({
                    where: {
                        id: payload.session_id,
                    }
                });

                if (find_user_session) {
                    await find_user_session.update({
                        login_token: token,
                    });
                }

                // update email address in email notfications
                const EmailNotification = models[project].tbl_email_notification;
                const find_email_notification = await EmailNotification.findOne({
                    where: {
                        account_id: payload.account_id,
                        email_address: payload.old_email_address,
                        status: 1
                    }
                });

                if (find_email_notification) {
                    await find_email_notification.update({
                        email_address: payload.email_address,
                    });
                }

                resolve(token);
            } catch (err) {
                reject(err);
            }
        });
    }

}

//* ############################    PRIVATE FUNCTIONS ########################################

const isUserDeleteAble = (project: string, user_id: number): Promise<boolean> => {
    return new Promise<boolean>(async (resolve, reject) => {
        try {
            const User = models[project].tbl_user;
            await User.findOne({
                where: {
                    id: user_id,
                },
            });
            resolve(true);
        } catch (err) {
            reject(err);
        }
    });
};

const deleteUserSession = (project: string, deleteUser: User) => {
    return new Promise<boolean>(async (resolve, reject) => {
        try {
            const UserSession = models[project].tbl_user_session;
            const UserSessionHistory = models[project].tbl_user_session_history;
            const UserSetting = models[project].tbl_user_setting;
            const EmailNotification = models[project].tbl_email_notification;

            const find_sessions = await UserSession.findAll({
                where: {
                    user_id: deleteUser.id,
                },
            });

            if (find_sessions.length > 0) {
                for (let i = 0; i < find_sessions.length; i++) {
                    const find_session = find_sessions[i];
                    await UserSessionHistory.create({
                        id: find_session.id,
                        user_id: find_session.user_id,
                        login_token: find_session.login_token,
                        fcm_token: find_session.fcm_token,
                        device_udid: find_session.device_udid,
                        device_type: find_session.device_type,
                        device_browser_model: find_session.device_browser_model,
                        os_type: find_session.os_type,
                        os_browser_version: find_session.os_browser_version,
                        app_version: find_session.app_version,
                        last_active_time: find_session.last_active_time,
                        login_time: find_session.login_time,
                    });

                    await find_session.destroy();
                }
            }

            await UserSetting.update({
                status: 0
            }, {
                where: {
                    user_id: deleteUser.id
                }
            });

            await EmailNotification.update({
                status: 0,
                email_address: deleteUser.email_address.concat('_deleted')
            }, {
                where: {
                    account_id: deleteUser.account_id,
                    email_address: deleteUser.email_address
                }
            });

            resolve(true);
        } catch (err) {
            reject(err);
        }
    });
};

const deleteCustomerOwner = (project: string, user: DecodeToken) => {
    return new Promise<boolean>(async (resolve, reject) => {
        try {
            const Account = models[project].tbl_account;
            const AccountAddress = models[project].tbl_account_address;
            const EmailNotification = models[project].tbl_email_notification;
            const UserInvite = models[project].tbl_user_invite;
            const FileManager = models[project].tbl_file_manager;

            await Account.update({
                status: 0,
            }, {
                where: {
                    id: user.account_id,
                },
            });

            await AccountAddress.update({
                status: 0,
            }, {
                where: {
                    account_id: user.account_id,
                },
            });

            await EmailNotification.update({
                status: 0,
            }, {
                where: {
                    account_id: user.account_id,
                },
            });

            await UserInvite.update({
                status: 'cancelled',
            }, {
                where: {
                    account_id: user.account_id,
                },
            });

            await FileManager.update({
                status: 0,
            }, {
                where: {
                    account_id: user.account_id,
                },
            });

            return resolve(true);
        } catch (err) {
            reject(err);
        }
    });
};

const deleteCustomerChild = (project: string, user: DecodeToken) => {
    return new Promise<boolean>(async (resolve, reject) => {
        try {
            const UserInvite = models[project].tbl_user_invite;

            const find_invite = await UserInvite.findOne({
                where: {
                    account_id: user.account_id,
                    email_address: user.email_address,
                },
            });

            if (find_invite) {
                await find_invite.update({
                    status: 'cancelled'
                });
            }

            return resolve(true);
        } catch (err) {
            reject(err);
        }
    });
};