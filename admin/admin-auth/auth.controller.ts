import { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import { ADMIN_ROLE_ID, PARTNER_ADMIN_ROLE_ID } from '../../../config/constant.config';
import { comparePassword } from '../../../helpers/bcrypt';
import { BadRequestResponse, SuccessResponse, UnauthorizedResponse } from '../../../helpers/http';
import { loginToken } from '../../../helpers/util';
import models from '../../../models';
import { LAFLogService } from '../../services/laf-log.service';

export class AdminAuthController {
  public login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const User = models[res.locals.project].tbl_user;
      const user = await User.findOne({
        where: {
          email_address: body.email_address,
          status: {
            [Op.ne]: 'trash',
          },
        },
      });
      if (!user) {
        await LAFLogService.updateCounter(body.email_address, res.locals.project);
        return UnauthorizedResponse(res, req.t('AUTH.INVALID_EMAIL'));
      }
      const check = (user.role_id === ADMIN_ROLE_ID || user.role_id === PARTNER_ADMIN_ROLE_ID);
      if (!check) {
        await LAFLogService.updateCounter(body.email_address, res.locals.project);
        return UnauthorizedResponse(res, req.t('AUTH.UNAUTHORIZED_USER'));
      }

      if (user.status === 'pending') {
        await LAFLogService.updateCounter(body.email_address, res.locals.project);
        return BadRequestResponse(res, req.t('AUTH.ACCOUNT_PENDING'));
      }
      if (user.status === 'suspend') {
        await LAFLogService.updateCounter(body.email_address, res.locals.project);
        return BadRequestResponse(res, req.t('AUTH.ACCOUNT_SUSPENDED'));
      }

      const is_valid = await comparePassword(body.password, user.password);
      if (!is_valid) {
        await LAFLogService.updateCounter(body.email_address, res.locals.project);
        return UnauthorizedResponse(res, req.t('AUTH.INVALID_PASSWORD'));
      }

      await LAFLogService.resetCounter(body.email_address, res.locals.project);

      user['project'] = res.locals.project;

      const token = loginToken(user, 'admin');
      const response = {
        token: token,
        email_address: user.email_address,
        user_id: user.id,
        role_id: user.role_id,
      };
      return SuccessResponse(res, req.t('AUTH.LOGIN_SUCCESS'), response);
    } catch (err) {
      next(err);
    }
  };
}
