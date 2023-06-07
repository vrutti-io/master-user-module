import { NODE_ENV } from '../../config/constant.config';
import { loginToken } from '../../helpers/util';
import { Session } from '../../interface/auth.interface';
import { EmailVerify, ForgotPasswordEmail } from '../../interface/email.interface';
import { User } from '../../interface/user.interface';
import models from '../../models';
import { EmailService } from '../../services/email.service';
import { ProjectService } from '../../services/project.service';
import firebase from 'firebase-admin';
import { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier';
import axios from 'axios';
import { MESSAGE } from '../../helpers/message';

export class AuthService {
  public static createUserSession(project: string, session: Session, user: User,) {
    return new Promise<string>(async (resolve, reject) => {
      try {
        const UserSession = models[project].tbl_user_session;
        const UserSetting = models[project].tbl_user_setting;
        const UserSessionHistory = models[project].tbl_user_session_history;

        const find_session = await UserSession.findOne({
          where: {
            os_type: session.os_type,
            device_udid: session.device_udid,
          },
        });

        if (find_session) {
          const session_history = {
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
          };
          await UserSessionHistory.findOrCreate({
            where: {
              id: find_session.id,
            },
            defaults: session_history,
          });
          await find_session.destroy();
        }

        const create_session = await UserSession.create({
          ...session,
          user_id: user.id,
        });

        const get_user_setting = await UserSetting.findOne({ where: { user_id: user.id } });

        const token = loginToken({
          id: user.id,
          name: user.name ?? '',
          email_address: user.email_address,
          role_id: user.role_id,
          account_id: user.account_id,
          project: project,
          session_id: create_session.id,
          customer_role_id: get_user_setting.cu_role_id
        }, 'web',);

        await create_session.update({
          login_token: token,
        });

        await get_user_setting.update({
          last_active: new Date(),
        });

        resolve(token);
      } catch (err) {
        reject(err);
      }
    });
  }

  public static sendEmailVerifyLink(project: string, user: User, ip: string) {
    return new Promise(async (resolve, reject) => {
      try {
        const email_content_replace: EmailVerify = {
          name: user.name ?? '',
          email_address: user.email_address,
          user_id: user.id,
          ip: ip,
        };
        const response = await EmailService.ses_email_verify(project, email_content_replace);
        resolve(response);
      } catch (err) {
        reject(err);
      }
    });
  }

  public static sendForgotPasswordLink(project: string, user: User, ip: string) {
    return new Promise(async (resolve, reject) => {
      try {
        const email_content_replace: ForgotPasswordEmail = {
          ip: ip,
          name: user.name ?? '',
          email_address: user.email_address,
          user_id: user.id,
        };
        const response = await EmailService.ses_forgot_password(project, email_content_replace);
        resolve(response);
      } catch (err) {
        reject(err);
      }
    });
  }

  public static firebaseAuth = (project: string, token: string) => {

    return new Promise<DecodedIdToken>(async (resolve, reject) => {
      try {
        const config = ProjectService.config[project].FIREBASE_CONFIG;
        const key = ProjectService.config[project].FIREBASE_KEY;

        if (firebase.apps.length) {

          /* Checking if the firebase app is already initialized. If it is, it will use the existing
          app to verify the token. */
          const app = firebase.apps.find((app) => app?.options.projectId === config.projectId);
          if (app) {
            const response = await app.auth().verifyIdToken(token);
            return resolve(response);
          }

        }

        firebase.initializeApp({
          credential: firebase.credential.cert({
            projectId: key.project_id,
            clientEmail: key.client_email,
            privateKey: key.private_key
          }),
          databaseURL: config.databaseURL,
          projectId: config.projectId,
        });

        const response = await firebase.auth().verifyIdToken(token);
        return resolve(response);
      } catch (err) {
        return reject(err);
      }
    });
  };

  public static validateRecaptcha = (project: string, token: string, action: string) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (NODE_ENV === 'test') return resolve(true);
        const secret_key = ProjectService.config[project].CAPTCHA_SITE_KEY;
        const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${secret_key}&response=${token}`);
        if (response.data.success) {
          if (response.data.action && response.data.action != action) {
            return reject(MESSAGE.INVALID_CAPTCHA);
          }
          if (response.data.score < 0.5) {
            return reject(MESSAGE.INVALID_CAPTCHA);
          }
          return resolve(true);
        } else {
          return reject(response.data['error-codes']);
        }
      } catch (err) {
        return reject(err);
      }
    });
  };

}
