import { NextFunction, Request, Response } from 'express';
import { ForbiddenResponse, SuccessResponse, UnauthorizedResponse, } from '../../../helpers/http';
import models from '../../../models';
import { randomString } from '../../../helpers/util';
import { hashPassword } from '../../../helpers/bcrypt';
import { UserService } from '../../services/user.service';
import { EmailService } from '../../../services/email.service';
import { INVITATION_RESEND_IN_MINS } from '../../../config/constant.config';
import { Op } from 'sequelize';
import moment from 'moment-timezone';

export class TeamController {

  public inviteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const UserInvite = models[res.locals.project].tbl_user_invite;

      const check_invite = await UserInvite.findOne({
        where: {
          email_address: body.email_address
        },
      });

      if (check_invite?.status === 'invited') return ForbiddenResponse(res, req.t('CUSTOMER.USER_ALREADY_INVITED'));
      if (check_invite?.status === 'accepted') return ForbiddenResponse(res, req.t('CUSTOMER.USER_ALREADY_REGISTERED'));

      const invitation_code = randomString(50);
      const create_user_invite = await UserInvite.create({
        account_id: res.locals.user.account_id,
        email_address: body.email_address,
        name: body.name,
        invitation_code: invitation_code,
        role_id: body.role_id,
        invited_by: res.locals.user.user_id,
        status: 'invited',
      });

      const email_content = {
        invitation_code: invitation_code,
        email_address: body.email_address,
        invited_by: res.locals.user.email_address,
      };
      await EmailService.ses_customer_invitation(res.locals.project, email_content);

      return SuccessResponse(res, req.t('CUSTOMER.USER_INVITED_SUCCESS'), create_user_invite);

    } catch (err) {
      next(err);
    }
  };

  public checkInvitationLink = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const UserInvite = models[res.locals.project].tbl_user_invite;
      const User = models[res.locals.project].tbl_user;

      const find_invite = await UserInvite.findOne({
        where: {
          invitation_code: code
        },
      });

      if (!find_invite) return UnauthorizedResponse(res, req.t('CUSTOMER.INVALID_LINK'));
      if (find_invite.status === 'accepted') return UnauthorizedResponse(res, req.t('CUSTOMER.USER_ALREADY_REGISTERED'));
      if (find_invite.status === 'expired') return UnauthorizedResponse(res, req.t('CUSTOMER.INVITATION_LINK_EXPIRED'));

      const find_user = await User.findOne({
        where: {
          email_address: find_invite.email_address,
          status: 'active'
        },
      });

      const user_registered = find_user ? true : false;

      return SuccessResponse(res, req.t('CUSTOMER.USER_INVITE_FOUND'), { user_registered });

    } catch (err) {
      next(err);
    }
  };

  public acceptInvitation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const UserInvite = models[res.locals.project].tbl_user_invite;
      const User = models[res.locals.project].tbl_user;
      const UserSetting = models[res.locals.project].tbl_user_setting;
      const UserAccountMap = models[res.locals.project].tbl_user_account_map;

      const find_invite = await UserInvite.findOne({
        where: {
          invitation_code: body.invitation_code
        },
      });

      if (!find_invite) return UnauthorizedResponse(res, req.t('CUSTOMER.USER_INVITE_NOT_FOUND'));
      if (find_invite.status === 'accepted') return ForbiddenResponse(res, req.t('CUSTOMER.USER_ALREADY_REGISTERED'));

      const find_user = await User.findOne({
        where: {
          email_address: find_invite.email_address,
          status: {
            [Op.or]: ['pending', 'active']
          },
        },
      });

      if (find_user?.status === 'pending') return ForbiddenResponse(res, req.t('CUSTOMER.USER_ACCOUNT_ACTIVATION_REQUIRED'));

      let userId = find_user?.id ?? null;

      if (!find_user) {

        const password = await hashPassword(body.password);
        const create_user = await User.create({
          account_id: find_invite.account_id,
          email_address: find_invite.email_address,
          name: body.name,
          password: password,
          status: 'active',
          email_verified: true,
          role_id: find_invite.role_id,
        });

        userId = create_user.id;

        await UserSetting.create({
          user_id: create_user.id,
          role_id: find_invite.role_id,
        });

        await UserService.addEmailForNotification(res.locals.project, create_user.id);

        const email_content = {
          name: create_user.email_address,
          email_address: create_user.email_address,
          user_id: create_user.id,
        };
        await EmailService.ses_customer_welcome(res.locals.project, email_content);
      }

      await UserAccountMap.create({
        user_id: userId,
        account_id: find_invite.account_id,
      });

      await find_invite.update({
        status: 'accepted',
      });

      return SuccessResponse(res, req.t('CUSTOMER.INVITATION_ACCEPTED_SUCCESS'));

    } catch (err) {
      next(err);
    }
  };

  public resendInvitation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const UserInvite = models[res.locals.project].tbl_user_invite;
      const EmailSentLog = models[res.locals.project].tbl_email_sent_log;

      const find_invite = await UserInvite.findOne({
        where: {
          id: id
        },
      });

      if (!find_invite) return UnauthorizedResponse(res, req.t('CUSTOMER.USER_INVITE_NOT_FOUND'));
      if (find_invite.status === 'accepted') return ForbiddenResponse(res, req.t('CUSTOMER.USER_ALREADY_REGISTERED'));

      const find_email = await EmailSentLog.findOne({
        where: {
          email_address: find_invite.email_address,
          template_name: 'ses_customer_invitation',
        },
        order: [
          ['id', 'DESC']
        ]
      });

      const expiry_time = moment(find_email.timestamp).add(INVITATION_RESEND_IN_MINS, 'minutes');
      if (moment().isBefore(expiry_time)) return UnauthorizedResponse(res, req.t('CUSTOMER.INVITATION_LINK_ALREADY_SENT'));

      const email_content = {
        invitation_code: find_invite.invitation_code,
        email_address: find_invite.email_address,
        invited_by: res.locals.user.email_address,
      };
      EmailService.ses_customer_invitation(res.locals.project, email_content);

      return SuccessResponse(res, req.t('CUSTOMER.INVITATION_RESEND_SUCCESS'));

    } catch (err) {
      next(err);
    }
  };

  public deleteInvitation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const UserInvite = models[res.locals.project].tbl_user_invite;
      const UserAccountMap = models[res.locals.project].tbl_user_account_map;

      const find_invite = await UserInvite.findOne({
        where: { id },
      });

      if (find_invite) {

        if (find_invite.status === 'accepted') {

          const User = models[res.locals.project].tbl_user;

          const find_user = await User.findOne({
            where: {
              email_address: find_invite.email_address,
            },
          });

          if (find_user) {
            UserService.deleteUser(res.locals.project, find_user.id, res.locals.user.user_id);

            await UserAccountMap.update({
              status: 0
            }, {
              where: {
                user_id: find_user.id,
                account_id: find_invite.account_id
              }
            });
          }

        }

        await find_invite.update({
          status: 'cancelled',
          email_address: find_invite.email_address.concat('_cancelled')
        });

      }
      return SuccessResponse(res, req.t('CUSTOMER.INVITATION_DELETED_SUCCESS'));

    } catch (err) {
      next(err);
    }
  };

  public updateTeamRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { body } = req;
      const UserInvite = models[res.locals.project].tbl_user_invite;
      const UserSetting = models[res.locals.project].tbl_user_setting;
      const User = models[res.locals.project].tbl_user;

      const find_invite = await UserInvite.findOne({
        where: { id },
      });

      if (find_invite) {

        await find_invite.update({
          role_id: body.role_id,
        });

        if (find_invite.status === 'accepted') {

          const find_user = await User.findOne({ where: { email_address: find_invite.email_address } });
          if (find_user) {

            await UserSetting.update({
              role_id: body.role_id
            }, {
              where: {
                user_id: find_user.id
              }
            });

          }
        }
      }
      return SuccessResponse(res, req.t('CUSTOMER.ROLE_UPDATED'));

    } catch (err) {
      next(err);
    }
  };

  public getInvitedUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const UserInvite = models[res.locals.project].tbl_user_invite;

      const find_invites = await UserInvite.findAll({
        where: {
          account_id: res.locals.user.account_id,
          status: {
            [Op.ne]: 'cancelled'
          }
        },
        attributes: ['id', 'email_address', 'status', 'role_id'],
        order: [['created_time', 'DESC']]
      });

      return SuccessResponse(res, req.t('COMMON.OK'), find_invites);

    } catch (err) {
      next(err);
    }
  };
}
