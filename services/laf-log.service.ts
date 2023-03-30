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

    public static resetCounter = async (email: string, project: string) => {
        return new Promise(async (resolve, reject) => {
            try {
                const path = `LAF:${project}:${email}`;

                await redisClient.expire(path, 0);
                
                return resolve(true);
            } catch (err) {
                reject(err);
            }
        });
    }
}