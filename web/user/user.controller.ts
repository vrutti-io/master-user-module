import { NextFunction, Request, Response } from 'express';
import { BadRequestResponse, SuccessResponse, UnauthorizedResponse, } from '../../../helpers/http';
import models from '../../../models';
import { UserService } from '../../services/user.service';
import { EmailService } from '../../../services/email.service';
import { CUSTOMER_CHILD_ROLE_ID, CUSTOMER_ROLE_ID, OTP_EXPIRES_IN_MINS } from '../../../config/constant.config';
import moment from 'moment-timezone';
import { UpdateUserToken } from '../../../interface/user.interface';

export class UserController {


  public getUserRoles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const CustomerRole = models[res.locals.project].master_customer_role;

      const find_roles = await CustomerRole.findAll({
        where: {
          status: 1
        },
        order: [
          ['disp_order', 'ASC']
        ]
      });

      return SuccessResponse(res, req.t('COMMON.OK'), find_roles);

    } catch (err) {
      next(err);
    }
  };


  public getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const User = models[res.locals.project].tbl_user;
      const UserSetting = models[res.locals.project].tbl_user_setting;

      const find_user = await User.findOne({
        where: {
          id: res.locals.user.user_id,
        },
      });
      const find_user_settings = await UserSetting.findOne({
        where: {
          user_id: res.locals.user.user_id,
        },
        attributes: ['lang']
      });

      let account_name = find_user.name;

      if (find_user.role_id === CUSTOMER_CHILD_ROLE_ID) {
        const find_parent_user = await User.findOne({
          where: {
            account_id: find_user.account_id,
            role_id: CUSTOMER_ROLE_ID
          },
          attributes: ['name']
        });
        account_name = find_parent_user.name;
      }

      const response = {
        id: find_user.id,
        email_address: find_user.email_address,
        name: find_user.name,
        mobile_no: find_user.mobile_no,
        social_auth_type: find_user.social_auth_type,
        lang: find_user_settings.lang,
        is_social_login: find_user.social_auth_token ? true : false,
        is_password_set: find_user.password ? true : false,
        is_child_account: find_user.role_id === CUSTOMER_CHILD_ROLE_ID ? true : false,
        account_name: account_name
      };

      return SuccessResponse(res, req.t('COMMON.SUCCESS'), response);

    } catch (err) {
      next(err);
    }

  };

  public updateUserProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const User = models[res.locals.project].tbl_user;
      const UserSetting = models[res.locals.project].tbl_user_setting;

      const find_user = await User.findOne({
        where: {
          id: res.locals.user.user_id,
        },
      });

      if (!find_user) return UnauthorizedResponse(res, req.t('CUSTOMER.USER_NOT_FOUND'));

      await find_user.update({
        name: body.name,
        mobile_no: body.mobile_no,
      });

      await UserSetting.update({
        lang: body.lang
      }, {
        where: {
          user_id: res.locals.user.user_id
        }
      });

      return SuccessResponse(res, req.t('CUSTOMER.PROFILE_UPDATED_SUCCESS'));

    } catch (err) {
      next(err);
    }
  };

  public sendOTPToVerifyNewEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const User = models[res.locals.project].tbl_user;
      const { body } = req;

      const find_user = await User.findOne({
        where: {
          id: res.locals.user.user_id,
        },
      });

      if (!find_user) return UnauthorizedResponse(res, req.t('CUSTOMER.USER_NOT_FOUND'));

      if (find_user.email_address === body.email_address) return BadRequestResponse(res, req.t('CUSTOMER.SAME_EMAIL'));

      const find_user_with_email = await User.findOne({
        where: {
          email_address: body.email_address,
        },
      });

      if (find_user_with_email) return BadRequestResponse(res, req.t('CUSTOMER.EMAIL_ALREADY_REGISTERED'));

      await EmailService.ses_customer_email_update_otp(res.locals.project, {
        email_address: body.email_address,
        user_id: find_user.id,
        ip: req.ip ?? '',
        name: find_user.name
      });

      return SuccessResponse(res, req.t('CUSTOMER.OTP_SENT'));

    } catch (err) {
      next(err);
    }
  };

  public reSendOTPToVerifyNewEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const VerificationCode = models[res.locals.project].tbl_verification_code;

      const find_otp = await VerificationCode.findOne({
        where: {
          user_id: res.locals.user.user_id,
          is_used: 0,
          type: 'update-email',
        },
        order: [['id', 'DESC']]
      });

      if (!find_otp) return BadRequestResponse(res, req.t('COMMON.SOMETHING_WENT_WRONG'));

      await EmailService.ses_customer_email_update_otp(res.locals.project, {
        email_address: find_otp.email_address,
        user_id: find_otp.user_id,
        ip: req.ip ?? '',
        name: find_otp.name
      });

      return SuccessResponse(res, req.t('CUSTOMER.OTP_SENT'));

    } catch (err) {
      next(err);
    }
  };

  public verifyOTPForNewEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const User = models[res.locals.project].tbl_user;
      const VerificationCode = models[res.locals.project].tbl_verification_code;

      const find_user = await User.findOne({
        where: {
          id: res.locals.user.user_id,
        },
      });

      if (!find_user) return UnauthorizedResponse(res, req.t('CUSTOMER.USER_NOT_FOUND'));

      const find_otp = await VerificationCode.findOne({
        where: {
          user_id: find_user.id,
          code: body.otp,
          is_used: 0,
          type: 'update-email',
        },
        order: [['id', 'DESC']]
      });

      if (!find_otp) return UnauthorizedResponse(res, req.t('CUSTOMER.OTP_INVALID'));

      const otp_expiry = moment(find_otp.request_time).add(OTP_EXPIRES_IN_MINS, 'minutes');
      if (moment().isAfter(otp_expiry)) return UnauthorizedResponse(res, req.t('CUSTOMER.OTP_EXPIRED'));

      const payload: UpdateUserToken = {
        id: find_user.id,
        email_address: find_otp.email_address,
        old_email_address: find_user.email_address,
        session_id: res.locals.user.session_id,
        customer_role_id: res.locals.user.customer_role_id,
        account_id: res.locals.user.account_id,
        role_id: res.locals.user.role_id,
      };

      const token = await UserService.updateUserToken(res.locals.project, payload);

      await find_user.update({
        email_address: find_otp.email_address,
      });

      await find_otp.update({
        is_used: 1,
        access_time: new Date(),
        access_ip: req.ip ?? '',
      });

      return SuccessResponse(res, req.t('CUSTOMER.OTP_VERIFIED'), { token });

    } catch (err) {
      next(err);
    }
  };

  public isSocialLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const User = models[res.locals.project].tbl_user;

      const find_user = await User.findOne({
        where: {
          id: res.locals.user.user_id,
        },
      });

      if (find_user.social_auth_token) return SuccessResponse(res, req.t('COMMON.OK'), true);

      return SuccessResponse(res, req.t('COMMON.OK'), false);

    } catch (err) {
      next(err);
    }
  };

  public isPasswordSet = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const User = models[res.locals.project].tbl_user;

      const find_user = await User.findOne({
        where: {
          id: res.locals.user.user_id,
        },
      });

      if (find_user.password) return SuccessResponse(res, req.t('COMMON.OK'), true);

      return SuccessResponse(res, req.t('AUTH.SOCIAL_LOGIN_SIGNUP'), false);

    } catch (err) {
      next(err);
    }
  };

  public unlinkSocialAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const User = models[res.locals.project].tbl_user;

      const find_user = await User.findOne({
        where: {
          id: res.locals.user.user_id,
        },
      });

      if (!find_user) return UnauthorizedResponse(res, req.t('CUSTOMER.USER_NOT_FOUND'));

      // if password is not set then user can not unlink social account
      if (!find_user.password) return UnauthorizedResponse(res, req.t('CUSTOMER.SET_PASSWORD'));

      await find_user.update({
        social_auth_token: null,
        social_auth_type: null,
      });

      return SuccessResponse(res, req.t('CUSTOMER.SOCIAL_ACCOUNT_UNLINKED'));

    } catch (err) {
      next(err);
    }
  };

}
