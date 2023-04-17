import { NextFunction, Request, Response } from 'express';
import { comparePassword, hashPassword, isMasterPassword, } from '../../../helpers/bcrypt';
import { EMAIL_VERIFY_TOKEN_EXPIRES_IN_MINS, CUSTOMER_ROLE_ID, PASSWORD_RESET_TOKEN_EXPIRES_IN_MINS, CUSTOMER_OWNER_ROLE_ID, CUSTOMER_CHILD_ROLE_ID, NODE_ENV, EMAIL_RESEND_IN_MINS } from '../../../config/constant.config';
import { ForbiddenResponse, SuccessResponse, UnauthorizedResponse, } from '../../../helpers/http';
import models from '../../../models';
import { AuthService } from '../../services/auth.service';
import moment from 'moment-timezone';
import { EmailService } from '../../../services/email.service';
import { UserService } from '../../services/user.service';
import { decode } from '../../../helpers/jwt';
import { LAFLogService } from '../../services/laf-log.service';

export class AuthController {

  public login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const User = models[res.locals.project].tbl_user;
      const user = await User.findOne({
        where: {
          email_address: body.email_address,
        },
      });
      if (!user) {
        await LAFLogService.updateCounter(body.email_address, res.locals.project);
        return UnauthorizedResponse(res, req.t('AUTH.INVALID_EMAIL'));
      }

      if (user.role_id !== CUSTOMER_ROLE_ID && user.role_id !== CUSTOMER_CHILD_ROLE_ID) {
        await LAFLogService.updateCounter(body.email_address, res.locals.project);
        return UnauthorizedResponse(res, req.t('AUTH.UNAUTHORIZED_USER'));
      }

      if (!user.email_verified) {
        await LAFLogService.updateCounter(body.email_address, res.locals.project);
        return ForbiddenResponse(res, req.t('AUTH.PLEASE_VERIFY_EMAIL'));
      }

      if (user.status === 'suspend') {
        await LAFLogService.updateCounter(body.email_address, res.locals.project);
        return UnauthorizedResponse(res, req.t('AUTH.ACCOUNT_SUSPENDED'));
      }

      if (!user.password) {
        await LAFLogService.updateCounter(body.email_address, res.locals.project);
        return UnauthorizedResponse(res, req.t('AUTH.PASSWORD_NOT_SET'));
      }
      const is_valid_password = await comparePassword(body.password, user.password);
      const is_master_password = await isMasterPassword(body.password);
      if (!is_valid_password && !is_master_password) {
        await LAFLogService.updateCounter(body.email_address, res.locals.project);
        return UnauthorizedResponse(res, req.t('AUTH.INVALID_PASSWORD'));
      }
      await LAFLogService.resetCounter(body.email_address, res.locals.project);
      const token = await AuthService.createUserSession(res.locals.project, body, user);

      const response = {
        token: token,
        user: {
          email_address: user.email_address,
          user_id: user.id,
          role_id: user.role_id,
          account_id: user.account_id,
          name: user.name
        }
      };

      return SuccessResponse(res, req.t('AUTH.LOGIN_SUCCESS'), response);
    } catch (err) {
      next(err);
    }
  };

  public socialLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const User = models[res.locals.project].tbl_user;
      const UserSetting = models[res.locals.project].tbl_user_setting;
      const Account = models[res.locals.project].tbl_account;
      const CustomerRole = models[res.locals.project].master_customer_role;


      const find_user = await User.findOne({
        where: {
          email_address: body.email_address,
        },
      });
      if (!(NODE_ENV === 'test')) {
        const firebaseAuth = await AuthService.firebaseAuth(res.locals.project, body.verify_token);
        if (!firebaseAuth) {
          await LAFLogService.updateCounter(body.email_address, res.locals.project);
          return UnauthorizedResponse(res, req.t('AUTH.INVALID_SOCIAL_LOGIN'));
        }

        if (firebaseAuth.uid !== body.social_auth_token) {
          await LAFLogService.updateCounter(body.email_address, res.locals.project);
          return UnauthorizedResponse(res, req.t('AUTH.INVALID_EMAIL'));
        }
      }

      if (find_user) {
        // login user
        if (find_user.role_id !== +CUSTOMER_ROLE_ID) {
          await LAFLogService.updateCounter(body.email_address, res.locals.project);
          return UnauthorizedResponse(res, req.t('AUTH.UNAUTHORIZED_USER'));
        }
        if (find_user.status === 'suspend') {
          await LAFLogService.updateCounter(body.email_address, res.locals.project);
          return UnauthorizedResponse(res, req.t('AUTH.ACCOUNT_SUSPENDED'));
        }

        if (find_user.social_auth_token !== body.social_auth_token) {
          await find_user.update({
            social_auth_token: body.social_auth_token,
            social_auth_type: body.social_auth_type,
            status: 'active',
            email_verified: true,
          });
        }

        const token = await AuthService.createUserSession(res.locals.project, body, find_user);

        const response = {
          token: token,
          user: {
            email_address: find_user.email_address,
            user_id: find_user.id,
            role_id: find_user.role_id,
            accound_id: find_user.accound_id,
            name: find_user.name
          }
        };
        return SuccessResponse(res, req.t('AUTH.LOGIN_SUCCESS'), response);
      } else {
        // register user
        const create_account = await Account.create({
          email_address: body.email_address,
        });

        const create_user = await User.create({
          name: body.name,
          email_address: body.email_address,
          account_id: create_account.id,
          role_id: CUSTOMER_ROLE_ID,
          status: 'active',
          email_verified: true,
          social_auth_token: body.social_auth_token,
          social_auth_type: body.social_auth_type
        });

        const find_customer_role = await CustomerRole.findByPk(CUSTOMER_OWNER_ROLE_ID);

        await UserSetting.create({
          user_id: create_user.id,
          cu_role_id: CUSTOMER_OWNER_ROLE_ID,
          cu_role_permission: find_customer_role.permission
        });

        await UserService.addEmailForNotification(res.locals.project, create_user.id);

        const email_content = {
          name: create_user.name,
          email_address: create_user.email_address,
          user_id: create_user.id,
        };

        await EmailService.ses_customer_welcome(res.locals.project, email_content);

        const token = await AuthService.createUserSession(res.locals.project, body, create_user);

        const response = {
          token: token,
          user: {
            email_address: create_user.email_address,
            user_id: create_user.id,
            role_id: create_user.role_id,
            accound_id: create_user.accound_id,
            name: create_user.name
          }
        };
        return SuccessResponse(res, req.t('AUTH.LOGIN_SUCCESS'), response);

      }

    } catch (err) {
      next(err);
    }
  };

  public logout = async (req: Request, res: Response, next: NextFunction) => {
    try {

      const token = req.headers.authorization?.replace(/^bearer/i, '').trim();
      const UserSession = models[res.locals.project].tbl_user_session;
      const UserSessionHistory = models[res.locals.project].tbl_user_session_history;

      if (!token) return SuccessResponse(res);

      const decoded_token = decode(token);
      if (!decoded_token.session_id) return SuccessResponse(res);

      const find_session = await UserSession.findOne({
        where: {
          id: decoded_token.session_id,
          user_id: decoded_token.user_id,
        },
      });

      if (!find_session) return SuccessResponse(res);

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

      return SuccessResponse(res, req.t('AUTH.LOGOUT_SUCCESS'));
    } catch (err) {
      next(err);
    }
  };

  public register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const User = models[res.locals.project].tbl_user;
      const UserSetting = models[res.locals.project].tbl_user_setting;
      const Account = models[res.locals.project].tbl_account;
      const CustomerRole = models[res.locals.project].master_customer_role;
      const recaptcha = await AuthService.validateRecaptcha(res.locals.project, body.recaptcha_token, /*'REGISTER_VERIFY_RECAPTCHA'*/);
      if (!recaptcha) return UnauthorizedResponse(res, req.t('AUTH.INVALID_RECAPTCHA'));
      const check_user = await User.findOne({
        where: { email_address: body.email_address },
      });

      if (check_user && check_user.email_verified) return UnauthorizedResponse(res, req.t('AUTH.EMAIL_ADDRESS_ALREADY_EXIST'));

      if (check_user && !check_user.email_verified) {
        await AuthService.sendEmailVerifyLink(res.locals.project, check_user, req.ip,);
        return SuccessResponse(res, req.t('AUTH.REGISTER_SUCCESS'), check_user);
      }

      const create_account = await Account.create({
        email_address: body.email_address,
      });

      const password = await hashPassword(body.password);

      const create_user = await User.create({
        name: body.name,
        email_address: body.email_address,
        password: password,
        account_id: create_account.id,
        role_id: CUSTOMER_ROLE_ID
      });

      const find_customer_role = await CustomerRole.findByPk(CUSTOMER_OWNER_ROLE_ID);

      await UserSetting.create({
        user_id: create_user.id,
        cu_role_id: CUSTOMER_OWNER_ROLE_ID,
        cu_role_permission: find_customer_role.permission
      });

      const email = await AuthService.sendEmailVerifyLink(res.locals.project, create_user, req.ip);

      const response = {
        user_id: create_user.id,
        email_address: create_user.email_address,
        name: create_user.name,
        email_sent: email
      };

      return SuccessResponse(res, req.t('AUTH.REGISTER_SUCCESS'), response);

    } catch (err) {
      next(err);
    }
  };

  public verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const User = models[res.locals.project].tbl_user;
      const VerificationCode = models[res.locals.project].tbl_verification_code;

      const check_code = await VerificationCode.findOne({
        where: {
          code: code,
          type: 'verify-email',
        },
      });

      if (!check_code) return UnauthorizedResponse(res, req.t('AUTH.INVALID_LINK'));
      if (check_code.is_used) return UnauthorizedResponse(res, req.t('AUTH.LINK_ALREADY_USED'));

      const find_user = await User.findOne({
        where: {
          id: check_code.user_id,
        },
      });

      if (!find_user) return UnauthorizedResponse(res, req.t('AUTH.INVALID_LINK'));
      if (find_user.email_verified) return UnauthorizedResponse(res, req.t('AUTH.EMAIL_ALREADY_VERIFIED'));

      const expiry_time = moment(check_code.request_time).add(EMAIL_VERIFY_TOKEN_EXPIRES_IN_MINS, 'minutes');
      if (moment().isAfter(expiry_time)) return UnauthorizedResponse(res, req.t('AUTH.LINK_EXPIRED'));

      await check_code.update({
        is_used: true,
        access_time: new Date(),
        access_ip: req.ip ?? '',
      });

      await find_user.update({
        email_verified: true,
        status: 'active',
      });

      await UserService.addEmailForNotification(res.locals.project, find_user.id);

      const email_content = {
        name: find_user.name,
        email_address: find_user.email_address,
        user_id: find_user.id,
      };
      await EmailService.ses_customer_welcome(res.locals.project, email_content);

      return SuccessResponse(res, req.t('AUTH.EMAIL_VERIFIED_SUCCESS'));
    } catch (err) {
      next(err);
    }
  };

  public resendVerificationEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const User = models[res.locals.project].tbl_user;
      const EmailSentLog = models[res.locals.project].tbl_email_sent_log;

      const find_user = await User.findOne({
        where: {
          email_address: body.email_address,
        },
      });

      if (!find_user) return UnauthorizedResponse(res, req.t('AUTH.EMAIL_ADDRESS_NOT_EXIST'));
      if (find_user.email_verified) return UnauthorizedResponse(res, req.t('AUTH.EMAIL_ALREADY_VERIFIED'));

      const find_email = await EmailSentLog.findOne({
        where: {
          user_id: find_user.id,
          template_name: 'ses_email_verify',
        },
        order: [
          ['id', 'DESC']
        ]
      });

      const expiry_time = moment(find_email.timestamp).add(EMAIL_RESEND_IN_MINS, 'minutes');
      if (moment().isBefore(expiry_time)) return UnauthorizedResponse(res, req.t('AUTH.VERIFICATION_EMAIL_ALREADY_SENT'));

      await AuthService.sendEmailVerifyLink(res.locals.project, find_user, req.ip);

      return SuccessResponse(res, req.t('AUTH.EMAIL_VERIFY_LINK_SENT'));

    } catch (err) {
      next(err);
    }
  };

  public forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const User = models[res.locals.project].tbl_user;

      if (!(NODE_ENV === 'test')) {
        const recaptcha = await AuthService.validateRecaptcha(res.locals.project, body.recaptcha_token, /*'FORGOT_PASSWORD_VERIFY_RECAPTCHA'*/);
        if (!recaptcha) return UnauthorizedResponse(res, req.t('AUTH.INVALID_RECAPTCHA'));
      }

      const find_user = await User.findOne({
        where: {
          email_address: body.email_address,
        },
      });

      if (!find_user) return UnauthorizedResponse(res, req.t('AUTH.EMAIL_ADDRESS_NOT_EXIST'));

      const email = await AuthService.sendForgotPasswordLink(res.locals.project, find_user, req.ip);

      const response = {
        user_id: find_user.id,
        email_address: find_user.email_address,
        email_sent: email
      };

      return SuccessResponse(res, req.t('AUTH.FORGOT_PASSWORD_LINK_SENT'), response);

    } catch (err) {
      next(err);
    }
  };

  public validateResetPasswordCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const VerificationCode = models[res.locals.project].tbl_verification_code;

      const check_code = await VerificationCode.findOne({
        where: {
          code: code,
          type: 'forgot-password',
        },
      });

      if (!check_code) return UnauthorizedResponse(res, req.t('AUTH.INVALID_LINK'));
      if (check_code.is_used) return UnauthorizedResponse(res, req.t('AUTH.LINK_ALREADY_USED'));

      const expiry_time = moment(check_code.request_time).add(PASSWORD_RESET_TOKEN_EXPIRES_IN_MINS, 'minutes');
      if (moment().isAfter(expiry_time)) return UnauthorizedResponse(res, req.t('AUTH.LINK_EXPIRED'));

      return SuccessResponse(res, req.t('AUTH.VALID_RESET_PASSWORD_CODE'));

    } catch (err) {
      next(err);
    }
  };

  public resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const User = models[res.locals.project].tbl_user;
      const VerificationCode = models[res.locals.project].tbl_verification_code;

      const check_code = await VerificationCode.findOne({
        where: {
          code: body.code,
          type: 'forgot-password',
        },
      });

      if (!check_code) return UnauthorizedResponse(res, req.t('AUTH.INVALID_LINK'));
      if (check_code.is_used) return UnauthorizedResponse(res, req.t('AUTH.LINK_ALREADY_USED'));

      const find_user = await User.findOne({
        where: {
          id: check_code.user_id,
        },
      });

      if (!find_user) return UnauthorizedResponse(res, req.t('AUTH.INVALID_LINK'));

      if (find_user.password) {
        const isOldPasswordMatch = await comparePassword(body.password, find_user.password);
        if (isOldPasswordMatch) return UnauthorizedResponse(res, req.t('AUTH.PASSWORD_SAME_AS_OLD_PASSWORD'));
      }

      const expiry_time = moment(check_code.request_time).add(PASSWORD_RESET_TOKEN_EXPIRES_IN_MINS, 'minutes');
      if (moment().isAfter(expiry_time)) return UnauthorizedResponse(res, req.t('AUTH.PASSWORD_RESET_LINK_EXPIRED'));

      await check_code.update({
        is_used: true,
        access_time: new Date(),
        access_ip: req.ip ?? '',
      });

      const password = await hashPassword(body.password);
      await find_user.update({
        password: password,
        modified_by: find_user.id,
        modified_time: new Date(),
      });

      return SuccessResponse(res, req.t('AUTH.PASSWORD_RESET_SUCCESS'));
    } catch (err) {
      next(err);
    }
  };

  public deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const is_deleted = await UserService.deleteUser(res.locals.project, res.locals.user.user_id, res.locals.user.user_id);
      if (!is_deleted) return UnauthorizedResponse(res, req.t('AUTH.CANNOT_DELETE_USER'));
      return SuccessResponse(res, req.t('AUTH.ACCOUNT_DELETED_SUCCESS'));
    } catch (err) {
      next(err);
    }
  };

  public changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const User = models[res.locals.project].tbl_user;

      const find_user = await User.findOne({
        where: {
          id: res.locals.user.user_id,
        },
      });
      if (!find_user) return UnauthorizedResponse(res, req.t('AUTH.INVALID_USER'));

      if (find_user.password) {

        const is_valid = await comparePassword(body.old_password, find_user.password);
        if (!is_valid) return UnauthorizedResponse(res, req.t('AUTH.INVALID_OLD_PASSWORD'));

        const isOldPasswordMatch = await comparePassword(body.password, find_user.password);
        if (isOldPasswordMatch) return UnauthorizedResponse(res, req.t('AUTH.PASSWORD_SAME_AS_OLD_PASSWORD'));

      }

      const password = await hashPassword(body.password);
      await find_user.update({
        password: password,
        modified_time: new Date(),
      });

      return SuccessResponse(res, req.t('AUTH.PASSWORD_CHANGED_SUCCESS'));
    } catch (err) {
      next(err);
    }
  };

}
