import { sendFactMiddle } from './../../../utils/facturacion/middleSendFact';
import { paymentPDFMiddle } from './../../../utils/facturacion/middlePDFPayment';
import { Router, NextFunction, Response, Request } from 'express';
import { file, success } from '../../../network/response';
const router = Router();
import Controller from './index';
import secure from '../../../auth/secure';
import { EPermissions } from '../../../enums/EfunctMysql';
import paymentMiddle from '../../../utils/facturacion/middleRecibo';
import dataPaymentMiddle from '../../../utils/facturacion/middleDataPayment';
import paymentMiddleGral from '../../../utils/facturacion/middleReciboGeneral';

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
        .then((status) => {
            success({ req, res, status: status });
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

const listCtaCteClient = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.listCtaCteClient(
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

const newPayment = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.registerPayment(req.body.newFact, req.body.fileName, req.body.filePath, req.body.modifyFact).then(dataFact => {
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

const functSellers = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const type: boolean = req.body.type
    if (type) {
        Controller.asignarVendedor(req.body.seller, req.body.client).then(data => {
            success({ req, res, message: data });
        }).catch(next)
    } else {
        Controller.desAsignarVendedor(req.body.seller, req.body.client).then(data => {
            success({ req, res, message: data });
        }).catch(next)
    }
}

const newPaymentGral = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.paymentGral(req.body.newFact, req.body.fileName, req.body.filePath, req.body.total, req.body.nDocCliente).then(dataFact => {
        file(req, res, dataFact.filePath, 'application/pdf', dataFact.fileName, dataFact);
    }).catch(next)
}

const clientesDeudas = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.clientesDeudas(
        Number(req.params.page),
        String(req.query.search),
        Number(req.query.cantPerPage)
    ).then(data => {
        success({ req, res, message: data });
    }).catch(next)
}

router
    .get("/dataFiscal", secure([EPermissions.clientes]), dataFiscalPadron)
    .get("/ctaCte/:page", secure([EPermissions.clientes]), listCtaCteClient)
    .get("/details/:id", secure([EPermissions.clientes]), get)
    .get("/clientesDeudas/:page", secure([EPermissions.ventas]), clientesDeudas)
    .get("/factDet", secure([EPermissions.clientes]), listaDetCtaCte)
    .get("/payments/:id", secure([EPermissions.ventas]), dataPaymentMiddle(), paymentPDFMiddle(), sendFactMiddle(), getDataPaymentPDF)
    .get("/:page", secure([EPermissions.clientes, EPermissions.ventas]), listPagination)
    .delete("/:id", secure([EPermissions.clientes]), remove)
    .get("/", secure([EPermissions.clientes]), list)
    .post("/payments", secure([EPermissions.clientes, EPermissions.ventas]), paymentMiddle(), paymentPDFMiddle(), sendFactMiddle(), newPayment)
    .post("/paymentsGral", secure([EPermissions.clientes, EPermissions.ventas]), paymentMiddleGral(), paymentPDFMiddle(), sendFactMiddle(), newPaymentGral)
    .post("/", secure([EPermissions.clientes]), upsert)
    .put("/sellers", secure([EPermissions.userAdmin]), functSellers)
    .put("/", secure([EPermissions.clientes]), upsert)

export = router;