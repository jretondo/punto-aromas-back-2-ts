import { file } from './../../../network/response';
import { sendFactMiddle } from './../../../utils/facturacion/middleSendFact';
import { Router, NextFunction, Response, Request } from 'express';
import { success } from '../../../network/response';
const router = Router();
import Controller from './index';
import secure from '../../../auth/secure';
import { EPermissions } from '../../../enums/EfunctMysql';
import { paymentPDFMiddleSeller } from '../../../utils/facturacion/middlePDFPaymentSeller';
import paymentMiddleSeller from '../../../utils/facturacion/middleReciboSeller';
import dataPaymentMiddleSeller from '../../../utils/facturacion/middleDataPaymentSeller';

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

const listCtaCteSeller = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.listCtaCteSeller(
        Number(req.query.idCliente),
        Boolean(req.query.pendiente),
        Number(req.params.page)).then((lista) => {
            success({
                req,
                res,
                status: 200,
                message: lista
            });
        }).catch(next)
};

const listPagination = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.list(
        Number(req.params.page),
        String(req.query.query),
        Number(req.query.cantPerPage),
        Number(req.body.user.id)
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
    Controller.upsert(req.body)
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
    Controller.getUser(Number(req.params.id))
        .then((data) => {
            success({ req, res, message: data });
        })
        .catch(next)
}

const myDataUser = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.getUser(req.body.user.id)
        .then((data) => {
            success({ req, res, message: data });
        })
        .catch(next)
}

const sellersList = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.sellerList().then(data => {
        success({ req, res, message: data });
    }).catch(next)
}

const newPayment = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.registerPayment(req.body.newFact, req.body.fileName, req.body.filePath, req.body.clienteData, req.body.ultRbo, next).then(dataFact => {
        file(req, res, dataFact.filePath, 'application/pdf', dataFact.fileName, dataFact);
    }).catch(next)
}

const getDataPaymentPDF = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (req.query.sendEmail) {
        success({ req, res })
    } else {
        Controller.getDataPayment(req.body.fileName, req.body.filePath)
            .then(dataFact => {
                file(req, res, dataFact.filePath, 'application/pdf', dataFact.fileName, dataFact);
            })
            .catch(next)
    }
}

const listaDetCtaCte = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.getDetailsFact(Number(req.query.idFact)).then((lista) => {
        success({
            req,
            res,
            status: 200,
            message: lista
        });
    }).catch(next)
};

router.get("/details/:id", secure([EPermissions.userAdmin]), get);
router.get("/mydata", secure(), myDataUser)
router.get("/sellers", secure([EPermissions.userAdmin, EPermissions.ventas]), sellersList)
router.get("/payments/:id", secure([EPermissions.ventas]), dataPaymentMiddleSeller(), paymentPDFMiddleSeller(), sendFactMiddle(), getDataPaymentPDF)
router.get("/ctaCte/:page", secure([EPermissions.userAdmin]), listCtaCteSeller)
router.get("/factDet", secure([EPermissions.clientes]), listaDetCtaCte)
router.get("/:page", secure([EPermissions.userAdmin]), listPagination);
router.get("/", secure([EPermissions.userAdmin]), list);
router.post("/payments", secure([EPermissions.clientes, EPermissions.ventas]), paymentMiddleSeller(), paymentPDFMiddleSeller(), sendFactMiddle(), newPayment)
router.post("/", secure([EPermissions.userAdmin]), upsert);
router.put("/", secure([EPermissions.userAdmin]), upsert);
router.delete("/:id", secure([EPermissions.userAdmin]), remove);

export = router;