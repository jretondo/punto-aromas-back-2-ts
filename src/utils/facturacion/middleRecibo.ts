import { ImodifyFactPay } from './../../interfaces/Irequests';
import { IWhereParams } from './../../interfaces/Ifunctions';
import { EModeWhere, EConcatWhere } from './../../enums/EfunctMysql';
import { Tables, Columns } from './../../enums/EtablesDB';
import { NextFunction, Request, Response } from 'express';
import { INewPV } from 'interfaces/Irequests';
import { IClientes, IFactura, IUser } from 'interfaces/Itables';
import ptosVtaController from '../../api/components/ptosVta';
import invoicesController from '../../api/components/invoices';
import clientesController from '../../api/components/clientes';
import errorSend from '../error';
import store from '../../store/mysql';

const paymentMiddle = () => {
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
                    { column: Columns.facturas.t_fact, object: String(-1) }
                ]
            }];

            const detalle: string = req.body.detalle
            const formaPago: number = req.body.formaPago
            const importe: number = (Math.round(req.body.importe * 100)) / 100
            const factId: number = req.body.factId
            const user: IUser = req.body.user
            const pvId = req.body.pvId;
            const pvData: Array<INewPV> = await ptosVtaController.get(pvId)
            const tFact: number = -1
            const letra = "REC"
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
            let cancelada = false
            const factData: Array<IFactura> = await invoicesController.get(factId)

            const totalCtaCte = factData[0].monto_cta_cte

            const cobrado = factData[0].monto_pago_cta_cte

            const pendiente = totalCtaCte - cobrado

            const porcentaje = 1 - ((pendiente - importe) / pendiente)

            const comision = (Math.round(factData[0].comision_imputar * porcentaje * 100) / 100)
            const costo = (Math.round(factData[0].costo_imputar * porcentaje * 100) / 100)

            const nvoPend = pendiente - importe
            const nvoCostoImp = factData[0].costo_imputar - costo
            const nvoMontoPago = factData[0].monto_pago_cta_cte + importe
            const nvoComisionImp = factData[0].comision_imputar - comision

            const cuit = factData[0].n_doc_cliente

            const clienteData: Array<IClientes> = await clientesController.getCuit2(cuit)

            if (nvoPend === 0) {
                cancelada = true
            } else {

            }

            const modifyFact: ImodifyFactPay = {
                costo_imputar: (Math.round(nvoCostoImp * 100)) / 100,
                monto_pago_cta_cte: (Math.round(nvoMontoPago * 100)) / 100,
                cancelada: cancelada,
                comision_imputar: (Math.round(nvoComisionImp * 100)) / 100
            }

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
                tipo_doc_cliente: Number(clienteData[0].cuit) === 0 ? 80 : 96,
                n_doc_cliente: Number(clienteData[0].ndoc),
                cond_iva_cliente: Number(clienteData[0].cond_iva),
                email_cliente: clienteData[0].email,
                nota_cred: false,
                fiscal: false,
                raz_soc_cliente: clienteData[0].razsoc,
                user_id: user.id || 0,
                seller_name: `${user.nombre} ${user.apellido}`,
                total_fact: (Math.round((importe) * 100)) / 100,
                total_iva: 0,
                total_neto: (Math.round((importe) * 100)) / 100,
                total_compra: (Math.round(costo * 100)) / 100,
                forma_pago: formaPago,
                pv_id: pvId,
                id_fact_asoc: factData[0].id_fact_asoc || 0,
                descuento: 0,
                det_rbo: detalle,
                costo_envio: 0,
                comision: (Math.round(comision * 100)) / 100,
                comision_imputar: 0,
                costo_imputar: 0,
                comision_paga: 0,
                monto_pago_cta_cte: 0,
                cancelada: false,
                monto_cta_cte: 0,
                comision_total: 0,
                id_seller_comision: clienteData[0].vendedor_id || 0,
                costo_total: 0
            }

            req.body.newFact = newFact
            req.body.pvData = pvData[0]
            req.body.clienteData = clienteData[0]
            req.body.modifyFact = modifyFact
            next();
        } catch (error) {
            console.error(error)
            next(errorSend("Faltan datos o hay datos erroneos, controlelo!"))
        }
    }
    return middleware
}

export = paymentMiddle