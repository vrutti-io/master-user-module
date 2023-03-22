import moment from "moment";
import { redisClient } from "../../helpers/redis";

export class LAFLogService {

    public static updateCounter = async (email: string, project: string) => {
        return new Promise(async (resolve, reject) => {
            try {
                const path = `LAF:${project}:${email}`;
                const check_data = await redisClient.json.get(path);

                if (check_data) {
                    const get_data = JSON.parse(JSON.stringify(check_data));
                    const data = {
                        laf_cnt: get_data.laf_cnt + 1,
                        laf_lt: new Date()
                    };
                    await redisClient.json.set(path, ".", data);
                } else {
                    const data = {
                        laf_cnt: 1,
                        laf_lt: new Date()
                    };
                    await redisClient.json.set(path, ".", data);
                    await redisClient.expire(path, 60 * 60 * 24);
                }
                return resolve(true);
            } catch (err) {
                reject(err);
            }
        });
    };

    public static checkLAF = async (project: string, email: string) => {
        return new Promise(async (resolve, reject) => {
            try {
                const get_path = `LAF:${project}:${email}`;
                const check_data = await redisClient.json.get(get_path);
                console.log('#################: ', check_data);
                if (check_data) {
                    const get_data = JSON.parse(JSON.stringify(check_data));
                    if (get_data.laf_cnt < 10 && get_data.laf_cnt >= 1) {
                        const expiry_time = moment(get_data.laf_lt).add(5, 'minutes');
                        if (moment().isBefore(expiry_time)) {
                            return resolve(false);
                        }
                        return resolve(true);
                    } else if (get_data.laf_cnt >= 10) {
                        const expiry_time = moment(get_data.laf_lt).add(60, 'minutes');
                        if (moment().isBefore(expiry_time)) {
                            return resolve(false);
                        }
                        return resolve(true);
                    }
                }
                return resolve(true);
            } catch (err) {
                reject(err);
            }
        });
    };
}