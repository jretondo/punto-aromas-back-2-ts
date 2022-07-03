import { Router, NextFunction, Response, Request } from 'express';
import { success } from '../../../network/response';
const router = Router();
import Controller from './index';
import secure from '../../../auth/secure';
import { EPermissions } from '../../../enums/EfunctMysql';
import uploadFile from '../../../utils/multer';
import { staticFolders } from '../../../enums/EStaticFiles';

const list = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.list(
        Number(req.params.page),
        String(req.query.query),
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

const varCost = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.varCost(
        Boolean(req.body.aumento),
        Number(req.body.porc),
        Number(req.body.round),
        Boolean(req.body.roundBool),
        String(req.query.query)
    )
        .then(() => {
            success({
                req,
                res
            });
        })
        .catch(next)
};

const upsert = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.upsert(req.body, req.body.imagenEliminada)
        .then(() => {
            success({
                req,
                res
            });
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
        .then(data => {
            success({ req, res, message: data });
        })
        .catch(next);
}

const getCategorys = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.getCategory()
        .then(data => {
            success({ req, res, message: data });
        })
        .catch(next);
}

const getSubCategorys = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.getSubCategory()
        .then(data => {
            success({ req, res, message: data });
        })
        .catch(next);
}

const updateCodBarras = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.asignarCodBarra(Number(req.params.id), req.body.codBarras)
        .then(data => {
            success({ req, res, message: data });
        })
        .catch(next);
}

const updateCost = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.updateCost(Number(req.params.id), req.body.cost, req.body.oldCost)
        .then(data => {
            console.log('data :>> ', data);
            success({ req, res, message: data });
        })
        .catch(next);
}

const getPublicList = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.publicList()
        .then(data => {
            success({ req, res, message: data })
        }).catch(next)
}

const getImages = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.getImagesProduct(Number(req.params.id))
        .then(data => {
            success({ req, res, message: data })
        }).catch(next)
}

const insertImages = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.newImg(req.body, req.body.imagenEliminada).then(() => {
        success({
            req,
            res
        });
    })
        .catch(next)
}

const correct = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Controller.correctVariedades()
        .then(data => {
            success({ req, res, message: data })
        }).catch(next)
}

router.get("/details/:id", secure([EPermissions.productos]), get);
//router.get("/correct", correct)
router.get("/getCat", secure([EPermissions.productos]), getCategorys);
router.get("/getGetSubCat", secure([EPermissions.productos]), getSubCategorys);
router.get("/public", getPublicList);
router.get("/images/:id", secure([EPermissions.productos]), getImages)
router.get("/:page", secure([EPermissions.productos, EPermissions.ventas]), list);
router.post("/varCost", secure([EPermissions.productos]), varCost);
router.post("/", secure([EPermissions.productos]), uploadFile(staticFolders.products, ["product"]), upsert);
router.put("/codBarra/:id", secure([EPermissions.productos]), updateCodBarras)
router.put("/cost/:id", secure([EPermissions.productos]), updateCost);
router.put("/images", secure([EPermissions.productos]), uploadFile(staticFolders.products, ["product"]), insertImages)
router.put("/", secure([EPermissions.productos]), uploadFile(staticFolders.products, ["product"]), upsert);
router.delete("/:id", secure([EPermissions.productos]), remove);

export = router;