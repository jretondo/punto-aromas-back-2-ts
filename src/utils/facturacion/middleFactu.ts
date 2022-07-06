import { NextFunction, Request, Response } from 'express';
import { INewFactura, INewProduct, INewPV } from 'interfaces/Irequests';
import { IDetFactura, IFactura, IUser, IModPriceProd } from 'interfaces/Itables';
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
            req.body.timer = Number(new Date())
            const body: INewFactura = req.body.dataFact
            const user: IUser = req.body.user
            const pvId = body.pv_id;
            const pvData: Array<INewPV> = await ptosVtaController.get(pvId);

            const fiscalBool = req.body.fiscal
            const variosPagos = body.variosPagos

            if (parseInt(fiscalBool) === 0) {
                body.fiscal = false
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
            const productsList: IfactCalc = await calcProdLista(body.lista_prod, body.costoEnvio, pvData[0].cond_iva);

            if (body.t_fact === 6 && productsList.totalFact < 10000 && body.cliente_tdoc === 99) {
                body.cliente_ndoc = 0
            }

            const descuento: number = body.descuentoPerc
            let descuentoNumber: number = 0
            let descuentoPer = 0

            let costoIvaEnvio: number = 0
            let netoEnvio: number = body.costoEnvio

            if (pvData[0].cond_iva === 1) {
                netoEnvio = body.costoEnvio / 1.21
                costoIvaEnvio = body.costoEnvio - netoEnvio
            }

            if (descuento !== 0) {
                descuentoNumber = Math.round((((productsList.totalFact - body.costoEnvio) * (descuento / 100)) * 100)) / 100
                descuentoPer = descuento
                productsList.totalFact = (productsList.totalFact) - ((productsList.totalFact - body.costoEnvio) * (descuento / 100))
                productsList.totalIva = (productsList.totalIva) - ((productsList.totalIva - costoIvaEnvio) * (descuento / 100))
                productsList.totalNeto = (productsList.totalNeto) - ((productsList.totalNeto - netoEnvio) * (descuento / 100))
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
                total_fact: (Math.round((productsList.totalFact) * 100)) / 100,
                total_iva: (Math.round((productsList.totalIva) * 100)) / 100,
                total_neto: (Math.round((productsList.totalNeto) * 100)) / 100,
                total_compra: (Math.round((productsList.totalCosto) * 100)) / 100,
                forma_pago: body.forma_pago,
                pv_id: body.pv_id,
                id_fact_asoc: 0,
                descuento: descuentoNumber,
                costo_envio: body.costoEnvio
            }

            let ivaList: Array<IIvaItem> = [];
            let dataFiscal:
                FactInscriptoProd |
                FactInscriptoServ |
                FactMonotribProd |
                FactMonotribServ |
                any = {}

            if (body.fiscal) {
                if (body.t_fact === 1) {
                    ivaList = await listaIva(productsList.listaProd, descuentoPer);
                    dataFiscal = {
                        CantReg: 1,
                        PtoVta: pvData[0].pv,
                        CbteTipo: body.t_fact,
                        DocTipo: cliente.cliente_tdoc,
                        DocNro: cliente.cliente_ndoc,
                        CbteFch: moment(body.fecha, "YYYY-MM-DD").format("YYYYMMDD"),
                        ImpTotal: (Math.round((productsList.totalFact) * 100)) / 100,
                        MonCotiz: 1,
                        MonId: "PES",
                        Concepto: Conceptos.Productos,
                        ImpTotConc: 0,
                        ImpNeto: (Math.round((productsList.totalNeto) * 100)) / 100,
                        ImpOpEx: 0,
                        ImpIVA: (Math.round((productsList.totalIva) * 100)) / 100,
                        ImpTrib: 0,
                        Iva: ivaList
                    }
                } else {
                    ivaList = await listaIva(productsList.listaProd, descuentoPer);
                    dataFiscal = {
                        CantReg: 1,
                        PtoVta: pvData[0].pv,
                        CbteTipo: body.t_fact,
                        DocTipo: cliente.cliente_tdoc,
                        DocNro: cliente.cliente_ndoc,
                        CbteFch: moment(body.fecha, "YYYY-MM-DD").format("YYYYMMDD"),
                        ImpTotal: (Math.round((productsList.totalFact) * 100)) / 100,
                        MonCotiz: 1,
                        MonId: "PES",
                        Concepto: Conceptos.Productos,
                        ImpTotConc: 0,
                        ImpNeto: (Math.round((productsList.totalNeto) * 100)) / 100,
                        ImpOpEx: 0,
                        ImpIVA: 0,
                        ImpTrib: 0
                    }
                }

            }
            req.body.newFact = newFact
            req.body.dataFiscal = dataFiscal
            req.body.pvData = pvData[0]
            req.body.productsList = productsList.listaProd
            req.body.variosPagos = variosPagos
            next();
        } catch (error) {
            console.error(error)
            next(errorSend("Faltan datos o hay datos erroneos, controlelo!"))
        }
    }
    return middleware
}

const calcProdLista = (productsList: INewFactura["lista_prod"], costoEnvio: number, condIva: number): Promise<IfactCalc> => {
    let dataAnt: Array<INewProduct> = [];
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
            let dataProd: Array<INewProduct> = [];
            if (prod.id_prod === idAnt) {
                dataProd = dataAnt
            } else {
                dataProd = await (await prodController.get(prod.id_prod)).productGral
            }
            idAnt = prod.id_prod
            dataAnt = dataProd

            const totalCosto: number = (Math.round(((dataProd[0].costo * prod.cant_prod)) * 100)) / 100;
            const totalProd: number = (Math.round(((prod.price * prod.cant_prod)) * 100)) / 100;
            const totalNeto: number = (Math.round((totalProd / (1 + (dataProd[0].iva / 100))) * 100)) / 100;
            const totalIva: number = (Math.round((totalNeto * (dataProd[0].iva / 100)) * 100)) / 100;

            const newProdFact: IDetFactura = {
                nombre_prod: `${dataProd[0].name} (marca: ${dataProd[0].subcategory})`,
                cant_prod: prod.cant_prod,
                unidad_tipo_prod: dataProd[0].unidad,
                id_prod: prod.id_prod,
                total_prod: totalProd,
                total_iva: totalIva,
                alicuota_id: dataProd[0].iva,
                total_costo: totalCosto,
                total_neto: totalNeto,
                precio_ind: prod.price
            }

            factura.listaProd.push(newProdFact);

            factura.totalFact = (Math.round((factura.totalFact + (totalProd)) * 100)) / 100;
            factura.totalIva = (Math.round((factura.totalIva + (totalIva)) * 100)) / 100;
            factura.totalNeto = (Math.round((factura.totalNeto + (totalNeto)) * 100)) / 100;
            factura.totalCosto = (Math.round((factura.totalCosto + (totalCosto)) * 100)) / 100;

            if (key === productsList.length - 1) {
                let costoIvaEnvio: number = 0
                let netoEnvio: number = costoEnvio
                if (condIva === 1) {
                    netoEnvio = costoEnvio / 1.21
                    costoIvaEnvio = costoEnvio - netoEnvio
                }

                factura.totalFact = (Math.round((factura.totalFact + Number(costoEnvio)) * 100)) / 100;
                factura.totalIva = (Math.round((factura.totalIva + Number(costoIvaEnvio)) * 100)) / 100;
                factura.totalNeto = (Math.round((factura.totalNeto + Number(netoEnvio)) * 100)) / 100;
                resolve(factura)
            }
        })
    })
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