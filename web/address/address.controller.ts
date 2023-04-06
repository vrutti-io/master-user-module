import { NextFunction, Request, Response } from 'express';
import { SuccessResponse } from "../../../helpers/http";
import models from "../../../models";

export class AddressController {

    public getCity = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { city } = req.params;

            const City = models[res.locals.project].master_city; 

            const get_city = await City.findAll({ 
                where: {
                    name: city,
                },
            });  

            if (get_city)
                return SuccessResponse(res, req.t('COMMON.OK'), get_city);

        } catch (err) {
            next(err);
        }
    };

    public getState = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { state } = req.params;

            const State = models[res.locals.project].master_state; 

            const get_state = await State.findAll({ 
                where: {
                    name: state,
                },
            });  

            if (get_state)
                return SuccessResponse(res, req.t('COMMON.OK'), get_state);

        } catch (err) {
            next(err);
        }
    };

    public getCountry = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { country } = req.params;

            const Country = models[res.locals.project].master_country; 

            const get_country = await Country.findAll({ 
                where: {
                    name: country,
                },
            });  

            if (get_country)
                return SuccessResponse(res, req.t('COMMON.OK'), get_country);

        } catch (err) {
            next(err);
        }
    };   
}