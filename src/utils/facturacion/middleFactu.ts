import { NextFunction, Request, Response } from 'express';
import { INewFactura, INewPriceProduct, INewProduct, INewPV } from 'interfaces/Irequests';
import { IDetFactura, IFactura, IUser } from 'interfaces/Itables';
import ptosVtaController from '../../api/components/ptosVta';
import prodController from '../../api/components/products';
import {
    AlicuotasIva,
    Conceptos,
    FactInscriptoProd,
    FactInscriptoServ,
    FactMonotribProd,
    FactMonotribServ,
    perIvaAlicuotas
} from './AfipClass';
import moment from 'moment';
import errorSend from '../error';

const factuMiddel = () => {
    const middleware = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const body: INewFactura = req.body.dataFact
            const user: IUser = req.body.user
            const pvId = body.pv_id;
            const pvData: Array<INewPV> = await ptosVtaController.get(pvId);
            const productsList: IfactCalc = await calcProdLista(body.lista_prod);
            const fiscalBool = req.body.fiscal
            if (parseInt(fiscalBool) === 0) {
                req.body.fiscal = false
            }
            let cliente = {
                cliente_tdoc: 99,
                cliente_ndoc: 0
            }

            if (body.cliente_bool) {
                cliente = {
                    cliente_tdoc: body.cliente_tdoc || 99,
                    cliente_ndoc: body.cliente_ndoc || 0
                }
            }

            let letra = "";
            if (body.fiscal) {
                if (pvData[0].cond_iva === 1) {
                    if (body.cond_iva === 1) {
                        if (pvData[0].fact_m === true) {
                            body.t_fact = 51
                            letra = "M"
                        } else {
                            body.t_fact = 1
                            letra = "A"
                        }
                    } else {
                        body.t_fact = 6
                        letra = "B"
                    }
                } else if (pvData[0].cond_iva === 4) {
                    body.t_fact = 6
                    letra = "6"
                } else {
                    body.t_fact = 11
                    letra = "C"
                }
            } else {
                body.t_fact = 0
                letra = "X"
            }

            if (body.t_fact === 6 && productsList.totalFact < 10000 && body.cliente_tdoc === 99) {
                body.cliente_ndoc = 0
            }

            const newFact: IFactura = {
                fecha: body.fecha,
                pv: pvData[0].pv,
                cbte: 0,
                letra: letra,
                t_fact: body.t_fact,
                cuit_origen: pvData[0].cuit,
                iibb_origen: pvData[0].iibb,
                ini_act_origen: pvData[0].ini_act,
                direccion_origen: pvData[0].direccion,
                raz_soc_origen: pvData[0].raz_soc,
                cond_iva_origen: pvData[0].cond_iva,
                tipo_doc_cliente: body.cliente_tdoc || 99,
                n_doc_cliente: body.cliente_ndoc || 0,
                cond_iva_cliente: body.cond_iva,
                email_cliente: body.cliente_email || "",
                nota_cred: false,
                fiscal: body.fiscal,
                raz_soc_cliente: body.cliente_name || "",
                user_id: user.id || 0,
                seller_name: `${user.nombre} ${user.apellido}`,
                total_fact: productsList.totalFact,
                total_iva: productsList.totalIva,
                total_neto: productsList.totalNeto,
                total_compra: productsList.totalCosto,
                forma_pago: body.forma_pago,
                pv_id: body.pv_id,
                id_fact_asoc: 0
            }

            let ivaList: Array<IIvaItem> = [];
            let dataFiscal:
                FactInscriptoProd |
                FactInscriptoServ |
                FactMonotribProd |
                FactMonotribServ |
                any = {}

            if (body.fiscal) {
                ivaList = await listaIva(productsList.listaProd);
                dataFiscal = {
                    CantReg: 1,
                    PtoVta: pvData[0].pv,
                    CbteTipo: body.t_fact,
                    DocTipo: cliente.cliente_tdoc,
                    DocNro: cliente.cliente_ndoc,
                    CbteFch: moment(body.fecha, "YYYY-MM-DD").format("YYYYMMDD"),
                    ImpTotal: productsList.totalFact,
                    MonCotiz: 1,
                    MonId: "PES",
                    Concepto: Conceptos.Productos,
                    ImpTotConc: 0,
                    ImpNeto: productsList.totalNeto,
                    ImpOpEx: 0,
                    ImpIVA: productsList.totalIva,
                    ImpTrib: 0,
                    Iva: ivaList
                }
            }
            req.body.newFact = newFact
            req.body.dataFiscal = dataFiscal
            req.body.pvData = pvData[0]
            req.body.productsList = productsList.listaProd
            next();
        } catch (error) {
            console.error(error)
            next(errorSend("Faltan datos o hay datos erroneos, controlelo!"))
        }
    }
    return middleware
}

const calcProdLista = (productsList: INewFactura["lista_prod"]): Promise<IfactCalc> => {
    let dataAnt: Array<INewPriceProduct> = [];
    let idAnt: number = 0;
    productsList.sort((a, b) => { return a.id_prod - b.id_prod })
    return new Promise((resolve, reject) => {
        let factura: IfactCalc = {
            listaProd: [],
            totalFact: 0,
            totalIva: 0,
            totalNeto: 0,
            totalCosto: 0
        }
        productsList.map(async (prod, key) => {
            let dataProd: Array<INewPriceProduct> = [];
            if (prod.type_price_id === idAnt) {
                dataProd = dataAnt
            } else {
                dataProd = await prodController.getPrices(prod.id_prod)
            }
            const pricdataProd: Array<INewProduct> = await (await prodController.getPrincipal(prod.id_prod)).productGral
            idAnt = prod.type_price_id
            dataAnt = dataProd
            const totalCosto = (Math.round(((dataProd[0].buy_price * prod.cant_prod)) * 100)) / 100;
            const totalProd = (Math.round(((dataProd[0].sell_price * prod.cant_prod)) * 100)) / 100;
            const totalNeto = (Math.round((totalProd / (1 + (dataProd[0].iva / 100))) * 100)) / 100;
            const totalIva = (Math.round((totalNeto * (dataProd[0].iva / 100)) * 100)) / 100;

            const newProdFact: IDetFactura = {
                nombre_prod: pricdataProd[0].name,
                cant_prod: prod.cant_prod,
                unidad_tipo_prod: pricdataProd[0].unidad,
                id_prod: prod.id_prod,
                total_prod: totalProd,
                total_iva: totalIva,
                alicuota_id: dataProd[0].iva,
                total_costo: totalCosto,
                total_neto: totalNeto,
                precio_ind: dataProd[0].sell_price
            }

            factura.listaProd.push(newProdFact);
            factura.totalFact = (Math.round((factura.totalFact + (totalProd)) * 100)) / 100;
            factura.totalIva = (Math.round((factura.totalIva + (totalIva)) * 100)) / 100;
            factura.totalNeto = (Math.round((factura.totalNeto + (totalNeto)) * 100)) / 100;
            factura.totalCosto = (Math.round((factura.totalCosto + (totalCosto)) * 100)) / 100;

            if (key === productsList.length - 1) {
                resolve(factura)
            }
        })
    })
}

const listaIva = async (listaProd: Array<IDetFactura>): Promise<Array<IIvaItem>> => {
    listaProd.sort((a, b) => { return a.alicuota_id - b.alicuota_id })
    let ivaAnt = 0;
    let listaIva: Array<IIvaItem> = []
    if (listaProd.length > 0) {
        return new Promise((resolve, reject) => {
            listaProd.map((item, key) => {
                let ivaAux = perIvaAlicuotas.find(e => e.per === item.alicuota_id) || { per: 0, id: 3 };
                const iva = ivaAux.id
                if (iva !== ivaAnt) {
                    listaIva.push({
                        Id: iva,
                        BaseImp: (Math.round((item.total_neto) * 100)) / 100,
                        Importe: (Math.round((item.total_iva) * 100)) / 100
                    })
                } else {
                    const index = listaIva.length - 1
                    listaIva[index] = {
                        Id: iva,
                        BaseImp: (Math.round((listaIva[index].BaseImp + (item.total_neto)) * 100)) / 100,
                        Importe: (Math.round((listaIva[index].Importe + (item.total_iva)) * 100)) / 100
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
interface IfactCalc {
    listaProd: Array<IDetFactura>,
    totalFact: number,
    totalIva: number,
    totalNeto: number,
    totalCosto: number
}
interface IIvaItem {
    Id: AlicuotasIva,
    BaseImp: number,
    Importe: number
}
export = factuMiddel