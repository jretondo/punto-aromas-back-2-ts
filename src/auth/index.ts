import { EPermissions } from './../enums/EfunctMysql';
import { Request, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import err from '../utils/error';
import { config } from '../config';
import error from '../utils/error';
import permissions from '../api/components/permissions';

const sign = (data: string) => {
    return jwt.sign(data, config.jwt.secret);
}

const check = {
    permission: async (req: Request, next: NextFunction, idPermission?: Array<EPermissions>) => {
        if (!idPermission) {
            const decoded = decodeHeader(req, next)
            next()
        } else {
            const decoded = decodeHeader(req, next)
            let cantPermissions = 0
            await new Promise((resolve) => {
                idPermission.map(async (item, key) => {
                    const permision = await permissions.getPermision(req.body.user.id, item);
                    const hayPermisos = permision.length;
                    cantPermissions = cantPermissions + hayPermisos
                    if (key === idPermission.length - 1) {
                        resolve("")
                    }
                })
            })

            if (cantPermissions < 1) {
                next(error("No tiene los permisos"));
            } else {
                next();
            }
        }
    }
};

const getToken = (auth: string, next: NextFunction) => {
    if (!auth) {
        next(err("No tiene los token envíado"))
    }

    if (auth.indexOf('Bearer ') === -1) {
        next(err("Formato invalido"))
    }

    return auth.replace('Bearer ', "")
};

const verify = (token: string) => {
    return jwt.verify(token, config.jwt.secret)
};

const decodeHeader = (req: Request, next: NextFunction) => {
    try {
        const authorization = req.headers.authorization || ""
        const token = getToken(authorization, next)
        const decoded = verify(token)
        req.body.user = decoded
        return decoded
    } catch (error) {
        //next(err("Token invalido"))
    }
};

export = {
    sign,
    check
}