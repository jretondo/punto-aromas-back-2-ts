import { EPermissions } from './../enums/EfunctMysql';
import { NextFunction, Request, Response } from 'express';
import auth from './index';

const checkAuth = (idPermission?: Array<EPermissions>) => {
    const middleware = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        auth.check.permission(req, next, idPermission)
    }
    return middleware
}

export = checkAuth