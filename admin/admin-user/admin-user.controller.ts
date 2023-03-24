import { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import { pageLimit, pageOffset } from '../../../helpers/util';
import { BadRequestResponse, ConflictRequestResponse, SuccessResponse, UnauthorizedResponse } from '../../../helpers/http';
import models from '../../../models';
import { hashPassword } from '../../../helpers/bcrypt';
import { UserService, } from '../../services/user.service';
import { CUSTOMER_CHILD_ROLE_ID, CUSTOMER_ROLE_ID } from '../../../config/constant.config';

export class AdminUserController {
  public getAllUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req;
      const { user } = res.locals;
      const Role = models[res.locals.project].tbl_role;
      const User = models[res.locals.project].tbl_user;
      const sequelize = models[res.locals.project].sequelize;
      User.belongsTo(Role, { foreignKey: { name: 'role_id', allowNull: false } });

      const searchText = query.searchText;
      const search: any = {};
      search[Op.and] = [];
      search[Op.and].push({
        status: {
          [Op.ne]: 'trash'
        },
        role_id: {
          [Op.and]: [{
            [Op.ne]: CUSTOMER_ROLE_ID
          }, {
            [Op.ne]: CUSTOMER_CHILD_ROLE_ID
          }]

        }
      });
      if (searchText) {
        search[Op.or] = [];
        search[Op.or].push(sequelize.literal(`tbl_user.id like '%${searchText}%'`));
        search[Op.or].push(sequelize.literal(`tbl_user.mobile_no like '%${searchText}%'`));
        search[Op.or].push(sequelize.literal(`tbl_user.name like '%${searchText}%'`));
        search[Op.or].push(sequelize.literal(`tbl_user.email_address like '%${searchText}%'`));
      }
      const limit = pageLimit(query.pageSize);
      const offset = pageOffset(query.pageIndex, limit);
      let column = `id`,
        direction = `DESC`;
      if (query.sortColumn) column = query.sortColumn as string;
      if (query.sortDirection) direction = query.sortDirection as string;
      const orderBy = [column, direction];

      let role_search = {};
      const role = await Role.findByPk(user.role_id);
      if (role.same_level_edit) {
        role_search = {
          level: {
            [Op.gte]: role.level
          }
        };
      } else if (role) {
        role_search = {
          level: {
            [Op.gt]: role.level
          }
        };
      }
      const users = await User.findAndCountAll({
        where: search,
        order: [orderBy],
        attributes: ['id', 'name', 'email_address', 'signup_time', 'status'],
        limit,
        offset,
        include: [
          {
            model: Role,
            where: role_search,
            attributes: ['name'],
          },
        ],
      });
      return SuccessResponse(res, req.t('COMMON.GET'), users);
    } catch (err) {
      next(err);
    }
  };

  public createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const User = models[res.locals.project].tbl_user;
      const password = await hashPassword(body.password);
      const create_user = await User.findOrCreate({
        where: {
          email_address: body.email_address,
        },
        defaults: {
          ...body,
          password,
          status: 'active'
        },
      });
      if (create_user[1]) {
        return SuccessResponse(res, req.t('USER.CREATE_USER_SUCCESS'), create_user[0]);
      } else {
        return ConflictRequestResponse(res, req.t('USER.USER_NOT_FOUND'));
      }
    } catch (err) {
      next(err);
    }
  };

  public updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = req;
      const { user } = res.locals;
      const { id } = req.params;
      const User = models[res.locals.project].tbl_user;
      const Role = models[res.locals.project].tbl_role;

      const token_role = await Role.findByPk(user.role_id);
      const find_user = await User.findByPk(id);

      if (find_user) {

        const find_role = await Role.findByPk(find_user.role_id);
        if (token_role.same_level_edit) {
          const levelequal = (token_role.level <= find_role.level);
          if (!levelequal) {
            return UnauthorizedResponse(res, "You can't edit this user");
          }
        } else if (token_role) {
          const levelequal = (token_role.level < find_role.level);
          if (!levelequal) {
            return UnauthorizedResponse(res, "You can't edit this user");
          }
        }
      } else {
        return BadRequestResponse(res, req.t('USER.USER_NOT_FOUND'));
      }
      const update_user = await User.findOne({
        where: {
          email_address: body.email_address,
          id: { [Op.ne]: id },
        },
      });
      if (update_user) return ConflictRequestResponse(res, req.t('USER.USER_EXIST'));
      await find_user.update(body);
      return SuccessResponse(res, req.t('USER.UPDATE_USER_SUCCESS'), find_user);

    } catch (err) {
      next(err);
    }
  };

  public deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { user } = res.locals;
      const delete_user = await UserService.deleteUser(res.locals.project, +id, user.user_id);
      if (delete_user) return SuccessResponse(res, req.t('USER.DELETE_USER_SUCCESS'));
      else return BadRequestResponse(res, req.t('USER.USER_NOT_DELETE_ABLE'));
    } catch (err) {
      next(err);
    }
  };

  public updateUserEmailVerification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { user } = res.locals;
      await UserService.updateUserEmailVerification(res.locals.project, +id, 1, user.user_id,);
      return SuccessResponse(res, req.t('USER.UPDATE_USER_EMAIL_SUCCESS'));
    } catch (err) {
      next(err);
    }
  };

  public updateUserMobileVerification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { user } = res.locals;
      await UserService.updateUserMobileVerification(res.locals.project, +id, 1, user.user_id);
      return SuccessResponse(res, req.t('USER.UPDATE_USER_MOBILE_SUCCESS'));
    } catch (err) {
      next(err);
    }
  };

  public updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { body } = req;
      const { user } = res.locals;
      await UserService.updateUserStatus(res.locals.project, +id, body.status, user.user_id);
      return SuccessResponse(res, req.t('USER.UPDATE_USER_STATUS_SUCCESS'));
    } catch (err) {
      next(err);
    }
  };

  public updateUserPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { body } = req;
      const { user } = res.locals;
      const User = models[res.locals.project].tbl_user;
      const password = await hashPassword(body.password);

      const find_user = await User.findOne({
        where: {
          id: +id,
        }
      });
      if (!find_user) return BadRequestResponse(res, req.t('USER.USER_NOT_FOUND'));

      await find_user.update({
        password,
        modified_by: user.user_id,
        modified_date: new Date(),
      });

      return SuccessResponse(res, req.t('USER.UPDATE_USER_PASSWORD_SUCCESS'));
    } catch (err) {
      next(err);
    }
  };
}