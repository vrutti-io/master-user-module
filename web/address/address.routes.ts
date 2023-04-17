import { Router } from "express";
import { Auth } from "src/middleware/auth.middleware";
import { AddressController } from "./address.controller";

export class AddressRoutes {
    router = Router();
    private addressCtrl = new AddressController();

    constructor() {

        this.router.get('/city/:city', [Auth], this.addressCtrl.getCity);

        this.router.get('/state/:state', [Auth], this.addressCtrl.getState);

        this.router.get('/country/:country', [Auth], this.addressCtrl.getCountry);

    }
}