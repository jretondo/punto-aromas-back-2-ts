import { NextFunction, Request, Response } from "express"
import { INewPV } from "interfaces/Irequests";
import { IDetFactura, IFactura, IUser } from "interfaces/Itables";
import moment from "moment";
import ControllerInvoices from '../../api/components/invoices';
import ControllerPtoVta from '../../api/components/ptosVta';
import { Conceptos, perIvaAlicuotas } from "./AfipClass";

const devFactMiddle = () => {
    const middleware = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        req.body.timer = Number(new Date())
        const idFact = req.body.idFact
        const fecha = req.body.fecha
        const detDelete: Array<IDetFactura> = req.body.prodList

        const dataFact: Array<IFactura> = await ControllerInvoices.get(idFact)
        const detFact: Array<IDetFactura> = await ControllerInvoices.getDetails(idFact)
        const user: IUser = req.body.user
        const pvData: Array<INewPV> = await ControllerPtoVta.get(dataFact[0].pv_id);
        const esFiscal = dataFact[0].fiscal
        const tipoFact = dataFact[0].t_fact
        let tipoNC: number = 0
        let letra: string = "DEV"
        if (esFiscal) {
            switch (tipoFact) {
                case 1:
                    tipoNC = 3
                    letra = "NC A"
                    break;
                case 6:
                    tipoNC = 8
                    letra = "NC B"
                    break;
                case 11:
                    tipoNC = 13
                    letra = "NC C"
                    break;
                case 51:
                    tipoNC = 53
                    letra = "NC M"
                    break;
                default:
                    tipoNC = 0
                    letra = "DEV"
                    break;
            }
        }

        let newCost = 0
        let newTotal = 0
        let newIva = 0
        let newNeto = 0
        let portion = 0
        new Promise((resolve, reject) => {
            detFact.map((item, key) => {
                portion = ((item.precio_ind * item.cant_prod) / item.total_prod)

                newCost = newCost + item.total_costo * portion
                newTotal = newTotal + item.total_prod * portion
                newIva = newIva + item.total_iva * portion
                newNeto = newNeto + item.total_neto * portion

                const precio_ind = - item.precio_ind
                const total_costo = - item.total_costo * portion
                const total_iva = - item.total_iva * portion
                const total_neto = - item.total_neto * portion
                const total_prod = - item.total_prod * portion
                newDet.push({ ...item, precio_ind, total_costo, total_iva, total_neto, total_prod })
                if (detFact.length - 1 === key) {
                    resolve(detFact)
                }
            })
        })

        console.log('dataFact :>> ', dataFact);

        const newFact: IFactura = {
            fecha: fecha,
            pv: dataFact[0].pv,
            cbte: 0,
            letra: letra,
            t_fact: tipoNC,
            cuit_origen: dataFact[0].cuit_origen,
            iibb_origen: dataFact[0].iibb_origen,
            ini_act_origen: dataFact[0].ini_act_origen,
            direccion_origen: dataFact[0].direccion_origen,
            raz_soc_origen: dataFact[0].raz_soc_origen,
            cond_iva_origen: dataFact[0].cond_iva_origen,
            tipo_doc_cliente: dataFact[0].tipo_doc_cliente || 99,
            n_doc_cliente: dataFact[0].n_doc_cliente || 0,
            cond_iva_cliente: dataFact[0].cond_iva_cliente,
            email_cliente: dataFact[0].email_cliente || "",
            nota_cred: true,
            fiscal: esFiscal,
            raz_soc_cliente: dataFact[0].raz_soc_cliente || "",
            user_id: user.id || 0,
            seller_name: `${user.nombre} ${user.apellido}`,
            total_fact: - newTotal,
            total_iva: - newIva,
            total_neto: - newNeto,
            total_compra: - newCost,
            forma_pago: dataFact[0].forma_pago,
            pv_id: dataFact[0].pv_id,
            id_fact_asoc: dataFact[0].id || 0,
            descuento: - dataFact[0].descuento * portion,
            costo_envio: - dataFact[0].costo_envio,
            costo_imputar: - dataFact[0].costo_imputar,
            comision: - dataFact[0].comision,
            comision_paga: - dataFact[0].comision_paga,
            monto_cta_cte: - dataFact[0].monto_cta_cte,
            monto_pago_cta_cte: - dataFact[0].monto_pago_cta_cte,
            cancelada: dataFact[0].cancelada,
            comision_imputar: - dataFact[0].comision_imputar,
            comision_total: - dataFact[0].comision_total,
            id_seller_comision: dataFact[0].id_seller_comision,
            costo_total: -dataFact[0].costo_total
        }

        let newDet: Array<IDetFactura> = []



        let ivaList: Array<IIvaItem> = [];
        let dataFiscal:
            FactInscriptoProd |
            FactInscriptoServ |
            FactMonotribProd |
            FactMonotribServ |
            any = {}

        if (esFiscal) {

            const descuentoPer = ((dataFact[0].descuento / (dataFact[0].total_fact + dataFact[0].descuento)) * 100)

            ivaList = await listaIva(detFact, descuentoPer);
            dataFiscal = {
                CantReg: 1,
                PtoVta: dataFact[0].pv,
                CbteTipo: newFact.t_fact,
                DocTipo: newFact.tipo_doc_cliente,
                DocNro: newFact.n_doc_cliente,
                CbteFch: moment(newFact.fecha, "YYYY-MM-DD").format("YYYYMMDD"),
                ImpTotal: - newFact.total_fact,
                MonCotiz: 1,
                MonId: "PES",
                Concepto: Conceptos.Productos,
                ImpTotConc: 0,
                ImpNeto: - newFact.total_neto,
                ImpOpEx: 0,
                ImpIVA: - newFact.total_iva,
                ImpTrib: 0,
                Iva: ivaList,
                CbtesAsoc: [{
                    Tipo: dataFact[0].t_fact,
                    PtoVta: dataFact[0].pv,
                    Nro: dataFact[0].cbte,
                    Cuit: dataFact[0].n_doc_cliente
                }]
            }
        }
        req.body.newFact = newFact
        req.body.dataFiscal = dataFiscal
        req.body.pvData = pvData[0]
        req.body.productsList = newDet

        next();
    }
    return middleware
}

const listaIva = async (listaProd: Array<IDetFactura>, descuento: number): Promise<Array<IIvaItem>> => {
    listaProd.sort((a, b) => { return a.alicuota_id - b.alicuota_id })
    let ivaAnt = 0;
    let listaIva: Array<IIvaItem> = []
    if (listaProd.length > 0) {
        return new Promise((resolve, reject) => {
            listaProd.map((item, key) => {
                let ivaAux = perIvaAlicuotas.find(e => e.per === item.alicuota_id) || { per: 0, id: 3 };
                const iva = ivaAux.id
                if (iva !== ivaAnt) {
                    if (descuento > 0) {
                        listaIva.push({
                            Id: iva,
                            BaseImp: (Math.round((item.total_neto - (item.total_neto * (descuento / 100))) * 100)) / 100,
                            Importe: (Math.round((item.total_iva - (item.total_iva * (descuento / 100))) * 100)) / 100
                        })

                    } else {
                        listaIva.push({
                            Id: iva,
                            BaseImp: (Math.round((item.total_neto) * 100)) / 100,
                            Importe: (Math.round((item.total_iva) * 100)) / 100
                        })
                    }
                } else {
                    const index = listaIva.length - 1
                    if (descuento > 0) {
                        listaIva[index] = {
                            Id: iva,
                            BaseImp: (Math.round((listaIva[index].BaseImp + (item.total_neto - (item.total_neto * (descuento / 100)))) * 100)) / 100,
                            Importe: (Math.round((listaIva[index].Importe + (item.total_iva - (item.total_iva * (descuento / 100)))) * 100)) / 100
                        }
                    } else {
                        listaIva[index] = {
                            Id: iva,
                            BaseImp: (Math.round((listaIva[index].BaseImp + (item.total_neto)) * 100)) / 100,
                            Importe: (Math.round((listaIva[index].Importe + (item.total_iva)) * 100)) / 100
                        }
                    }
                }
                ivaAnt = 5;
                if (key === listaProd.length - 1) {

                    resolve(listaIva)
                }
            })
        })
    } else {
        return listaIva
    }
}

interface IIvaItem {
    Id: AlicuotasIva,
    BaseImp: number,
    Importe: number
}

export = devFactMiddle