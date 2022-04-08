import { Router, NextFunction, Response, Request } from 'express';
import { success } from '../../../network/response';
const router = Router();
import Controller from './index';
import secure from '../../../auth/secure';
import { EPermissions } from '../../../enums/EfunctMysql';

const list = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.list(undefined, req.body.query)
        .then((lista: any) => {
            success({
                req,
                res,
                status: 200,
                message: lista
            });
        })
        .catch(next)
};

const listPagination = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.list(
        Number(req.params.page),
        String(req.query.search),
        Number(req.query.cantPerPage)
    )
        .then((lista: any) => {
            success({
                req,
                res,
                status: 200,
                message: lista
            });
        })
        .catch(next)
};

const upsert = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.upsert(req.body, next)
        .then(response => {
            if (response) {
                success({
                    req,
                    res
                });
            } else {
                next(response);
            }
        })
        .catch(next)
}

const remove = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.remove(Number(req.params.id))
        .then(() => {
            success({ req, res });
        })
        .catch(next)
}

const get = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.get(Number(req.params.id))
        .then((data) => {
            success({ req, res, message: data })
        })
        .catch(next)
}

const dataFiscalPadron = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.dataFiscalPadron(Number(req.query.cuit), String(req.query.cert), String(req.query.key), Number(req.query.cuitPv))
        .then((data) => {
            success({ req, res, message: data })
        })
        .catch(next)
}

router
    .get("/dataFiscal", secure(EPermissions.proveedores), dataFiscalPadron)
    .get("/details/:id", secure(EPermissions.proveedores), get)
    .get("/:page", secure(EPermissions.proveedores), listPagination)
    .delete("/:id", secure(EPermissions.proveedores), remove)
    .get("/", secure(EPermissions.proveedores), list)
    .post("/", secure(EPermissions.proveedores), upsert)
    .put("/", secure(EPermissions.proveedores), upsert)

export = router;