import { IWhereParams } from '../../interfaces/Ifunctions';
import { EModeWhere, EConcatWhere } from '../../enums/EfunctMysql';
import { Tables, Columns } from '../../enums/EtablesDB';
import { NextFunction, Request, Response } from 'express';
import { INewPV } from 'interfaces/Irequests';
import { IFactura, IUser } from 'interfaces/Itables';
import ptosVtaController from '../../api/components/ptosVta';
import usersController from '../../api/components/user';
import errorSend from '../error';
import store from '../../store/mysql';

const paymentMiddleSeller = () => {
    const middleware = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const filters: Array<IWhereParams> = [{
                mode: EModeWhere.strict,
                concat: EConcatWhere.none,
                items: [
                    { column: Columns.facturas.t_fact, object: String(-2) }
                ]
            }];

            const detalle: string = req.body.detalle
            const formaPago: number = req.body.formaPago
            const importe: number = req.body.importe
            const clienteID: number = req.body.vendedorId
            const user: IUser = req.body.user
            const pvId = req.body.pvId;
            const pvData: Array<INewPV> = await ptosVtaController.get(pvId)
            const tFact: number = -2
            const letra = "PAGO"
            const getHighterNum: Array<{ last: number }> = await store.list(Tables.FACTURAS, [`MAX(${Columns.facturas.cbte}) as last`], filters)
            const lastNumber = 0
            let cbte = 0
            try {
                cbte = getHighterNum[0].last
            } catch (error) {

            }
            if (lastNumber > 0) {
                cbte = lastNumber
            }

            const clienteData: Array<IUser> = await usersController.getUser(clienteID)

            const newFact: IFactura = {
                fecha: (new Date()),
                pv: pvData[0].pv,
                cbte: cbte + 1,
                letra: letra,
                t_fact: tFact,
                cuit_origen: pvData[0].cuit,
                iibb_origen: pvData[0].iibb,
                ini_act_origen: pvData[0].ini_act,
                direccion_origen: pvData[0].direccion,
                raz_soc_origen: pvData[0].raz_soc,
                cond_iva_origen: pvData[0].cond_iva,
                tipo_doc_cliente: 96,
                n_doc_cliente: 0,
                cond_iva_cliente: 0,
                email_cliente: clienteData[0].email,
                nota_cred: false,
                fiscal: false,
                raz_soc_cliente: clienteData[0].nombre + " " + clienteData[0].apellido,
                user_id: user.id || 0,
                seller_name: `${user.nombre} ${user.apellido}`,
                total_fact: - (Math.round((importe) * 100)) / 100,
                total_iva: 0,
                total_neto: - (Math.round((importe) * 100)) / 100,
                total_compra: 0,
                forma_pago: formaPago,
                pv_id: pvId,
                id_fact_asoc: 0,
                descuento: 0,
                det_rbo: detalle,
                costo_envio: 0,
                costo_imputar: 0,
                comision: 0,
                comision_imputar: 0,
                comision_paga: 0,
                monto_cta_cte: 0,
                monto_pago_cta_cte: 0,
                cancelada: false,
                comision_total: (Math.round((importe) * 100)) / 100,
                id_seller_comision: clienteData[0].id || 0,
                costo_total: 0
            }

            req.body.newFact = newFact
            req.body.pvData = pvData[0]
            req.body.clienteData = clienteData[0]
            next();
        } catch (error) {
            console.error(error)
            next(errorSend("Faltan datos o hay datos erroneos, controlelo!"))
        }
    }
    return middleware
}

export = paymentMiddleSeller