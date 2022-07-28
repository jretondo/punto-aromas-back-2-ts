import { ImodifyFactPay } from '../../interfaces/Irequests';
import { Iorder, IWhereParams } from '../../interfaces/Ifunctions';
import { EModeWhere, EConcatWhere } from '../../enums/EfunctMysql';
import { Tables, Columns } from '../../enums/EtablesDB';
import { NextFunction, Request, Response } from 'express';
import { INewPV } from 'interfaces/Irequests';
import { IClientes, IFactura, IUser } from 'interfaces/Itables';
import ptosVtaController from '../../api/components/ptosVta';
import invoicesController from '../../api/components/invoices';
import clientesController from '../../api/components/clientes';
import errorSend from '../error';
import store from '../../store/mysql';

const paymentMiddleGral = () => {
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
            const nDocCliente: number = req.body.nDocCliente
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

            const filter3: Array<IWhereParams> = [{
                mode: EModeWhere.strict,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.facturas.id_fact_asoc, object: String(0) },
                    { column: Columns.facturas.n_doc_cliente, object: String(nDocCliente) },
                    { column: Columns.facturas.cancelada, object: String(0) }
                ]
            }, {
                mode: EModeWhere.higherEqual,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.facturas.t_fact, object: String(0) }
                ]
            }, {
                mode: EModeWhere.higher,
                concat: EConcatWhere.and,
                items: [
                    { column: `${Columns.facturas.monto_cta_cte} - ${Columns.facturas.monto_pago_cta_cte}`, object: String(0) }
                ]
            }, {
                mode: EModeWhere.strict,
                concat: EConcatWhere.or,
                items: [
                    { column: Columns.facturas.forma_pago, object: String(4) },
                    { column: Columns.facturas.forma_pago, object: String(5) },
                ]
            }];

            const orden: Iorder = {
                columns: [Columns.facturas.id],
                asc: true
            }

            const dataFact: Array<IFactura> = await store.list(Tables.FACTURAS, ["*"], filter3, undefined, undefined, undefined, orden)
            console.log('dataFact :>> ', dataFact);
            console.log('importe :>> ', importe);
            console.log('dataFact :>> ', dataFact);
            let totalRecibo = importe
            let newComision = 0
            let newCosto = 0
            await new Promise((resolve, reject) => {
                dataFact.map((factura, key) => {
                    console.log('total_fact :>> ', factura.total_fact);
                    console.log('factura.cbte :>> ', factura.cbte);
                    console.log('totalRecibo :>> ', totalRecibo);
                    console.log('newCosto :>> ', newCosto);
                    console.log('______________________________________________');
                    const ctacteTot = factura.monto_cta_cte
                    const ctactePaga = factura.monto_pago_cta_cte
                    const ctactePend = (Math.round((ctacteTot - ctactePaga) * 100)) / 100
                    if (totalRecibo > 0) {
                        if (ctactePend > totalRecibo) {
                            const porcentaje = totalRecibo / ctactePend

                            newComision = newComision + (factura.comision_imputar * porcentaje)
                            newCosto = newCosto + (factura.costo_imputar * porcentaje)
                            totalRecibo = 0
                        } else {
                            newComision = newComision + factura.comision_imputar
                            newCosto = newCosto + factura.costo_imputar
                            totalRecibo = totalRecibo - ctactePend
                        }
                    }
                    if (key === dataFact.length - 1) {
                        resolve("")
                    }

                })
            })

            const clienteData: Array<IClientes> = await clientesController.getCuit2(nDocCliente)

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
                total_compra: (Math.round(newCosto * 100)) / 100,
                forma_pago: formaPago,
                pv_id: pvId,
                id_fact_asoc: 0,
                descuento: 0,
                det_rbo: detalle,
                costo_envio: 0,
                comision: (Math.round(newComision * 100)) / 100,
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
            req.body.total = importe
            next();
        } catch (error) {
            console.error(error)
            next(errorSend("Faltan datos o hay datos erroneos, controlelo!"))
        }
    }
    return middleware
}

export = paymentMiddleGral