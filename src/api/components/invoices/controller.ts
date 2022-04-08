import { createListSellsPDF } from './../../../utils/facturacion/lists/createListSellsPDF';
import { EConcatWhere, EModeWhere, ESelectFunct } from '../../../enums/EfunctMysql';
import { Tables, Columns } from '../../../enums/EtablesDB';
import StoreType from '../../../store/mysql';
import getPages from '../../../utils/getPages';
import {
    AfipClass,
    CbteTipos
} from '../../../utils/facturacion/AfipClass'
import ptosVtaController from '../ptosVta';
import { Ipages, IWhereParams } from 'interfaces/Ifunctions';
import { IClientes, IDetFactura, IFactura } from 'interfaces/Itables';
import { INewPV } from 'interfaces/Irequests';
import ControllerStock from '../stock';
import ControllerClientes from '../clientes';
import fs from 'fs';
import { NextFunction } from 'express';

export = (injectedStore: typeof StoreType) => {
    let store = injectedStore;

    const list = async (pvId: number, fiscal: number, cbte?: number, page?: number, item?: string, cantPerPage?: number) => {

        let filter0: IWhereParams | undefined = undefined;
        let filter1: IWhereParams | undefined = undefined;
        let filter2: IWhereParams | undefined = undefined;
        let filters: Array<IWhereParams> = [];
        filter0 = {
            mode: EModeWhere.strict,
            concat: EConcatWhere.and,
            items: [
                { column: Columns.facturas.pv_id, object: String(pvId) },
                { column: Columns.facturas.fiscal, object: String(fiscal) },
            ]
        }
        filters.push(filter0);
        if (item) {
            filter1 = {
                mode: EModeWhere.like,
                concat: EConcatWhere.or,
                items: [
                    { column: Columns.facturas.cae, object: String(item) },
                    { column: Columns.facturas.n_doc_cliente, object: String(item) },
                    { column: Columns.facturas.fecha, object: String(item) },
                    { column: Columns.facturas.raz_soc_cliente, object: String(item) }
                ]
            };
            filters.push(filter1);
        }

        if (cbte) {
            filter2 = {
                mode: EModeWhere.strict,
                concat: EConcatWhere.none,
                items: [
                    { column: Columns.facturas.cbte, object: String(cbte) },
                ]
            }
            filters.push(filter2);
        }

        let pages: Ipages;
        if (page) {
            pages = {
                currentPage: page,
                cantPerPage: cantPerPage || 10,
                order: Columns.facturas.id,
                asc: true
            };
            const data = await store.list(Tables.FACTURAS, [ESelectFunct.all], filters, undefined, pages);
            const cant = await store.list(Tables.FACTURAS, [`COUNT(${ESelectFunct.all}) AS COUNT`], filters, undefined, undefined);
            const pagesObj = await getPages(cant[0].COUNT, 10, Number(page));
            return {
                data,
                pagesObj
            };
        } else {
            const data = await store.list(Tables.FACTURAS, [ESelectFunct.all], filters, undefined, undefined);
            return {
                data
            };
        }
    }

    const cajaList = async (pdf: boolean, userId: number, ptoVtaId: number, desde: string, hasta: string, page?: number, cantPerPage?: number): Promise<any> => {

        const filters: Array<IWhereParams> = [{
            mode: EModeWhere.strict,
            concat: EConcatWhere.and,
            items: [
                { column: Columns.facturas.user_id, object: String(userId) },
                { column: Columns.facturas.pv_id, object: String(ptoVtaId) }
            ]
        }];

        const filter1: IWhereParams = {
            mode: EModeWhere.higherEqual,
            concat: EConcatWhere.none,
            items: [
                { column: Columns.facturas.fecha, object: String(desde) }
            ]
        };

        const filter2: IWhereParams = {
            mode: EModeWhere.lessEqual,
            concat: EConcatWhere.none,
            items: [
                { column: Columns.facturas.fecha, object: String(hasta) }
            ]
        };

        filters.push(filter1, filter2)

        let pages: Ipages;

        if (page) {
            pages = {
                currentPage: page,
                cantPerPage: cantPerPage || 10,
                order: Columns.facturas.id,
                asc: true
            };
            const totales = await store.list(Tables.FACTURAS, [`SUM(${Columns.facturas.total_fact}) AS SUMA`, Columns.facturas.forma_pago], filters, [Columns.facturas.forma_pago], undefined);
            const data = await store.list(Tables.FACTURAS, [ESelectFunct.all], filters, undefined, pages, undefined, { columns: [Columns.facturas.fecha], asc: false });
            const cant = await store.list(Tables.FACTURAS, [`COUNT(${ESelectFunct.all}) AS COUNT`], filters, undefined, undefined);
            const pagesObj = await getPages(cant[0].COUNT, 10, Number(page));
            return {
                data,
                pagesObj,
                totales
            };
        } else {
            const totales = await store.list(Tables.FACTURAS, [`SUM(${Columns.facturas.total_fact}) AS SUMA`, Columns.facturas.forma_pago], filters, [Columns.facturas.forma_pago], undefined);
            const data = await store.list(Tables.FACTURAS, [ESelectFunct.all], filters, undefined, undefined);

            const dataFact = {
                filePath: "",
                fileName: ""
            }

            if (pdf) {
                const cajaList = await createListSellsPDF(userId, ptoVtaId, desde, hasta, totales, data)
                console.log('cajaList :>> ', cajaList);
                return cajaList
            } else {
                return {
                    data,
                    totales
                };
            }
        }
    }

    const get = async (id: number) => {
        return await store.get(Tables.FACTURAS, id);
    }

    const remove = async (id: number) => {
        return await store.remove(Tables.FACTURAS, { id });
    }

    const insertFact = async (
        pvId: number,
        newFact: IFactura,
        newDetFact: Array<IDetFactura>,
        factFiscal: FactInscriptoProd |
            FactInscriptoProdNC |
            FactInscriptoServ |
            FactInscriptoServNC |
            FactMonotribProd |
            FactMonotribProdNC |
            FactMonotribServ |
            FactMonotribServNC) => {

        if (newFact.fiscal) {
            newFact.cae = factFiscal.CAE
            newFact.vto_cae = new Date(factFiscal.CAEFchVto || "") || new Date()
        }

        const result = await store.insert(Tables.FACTURAS, newFact);
        if (result.affectedRows > 0) {
            const factId = result.insertId
            const headers: Array<string> = [
                Columns.detallesFact.fact_id,
                Columns.detallesFact.id_prod,
                Columns.detallesFact.nombre_prod,
                Columns.detallesFact.cant_prod,
                Columns.detallesFact.unidad_tipo_prod,
                Columns.detallesFact.total_prod,
                Columns.detallesFact.total_iva,
                Columns.detallesFact.total_costo,
                Columns.detallesFact.total_neto,
                Columns.detallesFact.alicuota_id,
                Columns.detallesFact.precio_ind
            ]
            const rows: Promise<Array<Array<any>>> = new Promise((resolve, reject) => {
                const rowsvalues: Array<Array<any>> = []
                newDetFact.map((item, key) => {
                    const values = []
                    values.push(factId)
                    values.push(item.id_prod)
                    values.push(item.nombre_prod)
                    values.push(item.cant_prod)
                    values.push(item.unidad_tipo_prod)
                    values.push(item.total_prod)
                    values.push(item.total_iva)
                    values.push(item.total_costo)
                    values.push(item.total_neto)
                    values.push(item.alicuota_id)
                    values.push(item.precio_ind)
                    rowsvalues.push(values)
                    if (key === newDetFact.length - 1) {
                        resolve(rowsvalues)
                    }
                })
            })
            const resultinsert = await store.mInsert(Tables.DET_FACTURAS, { headers: headers, rows: await rows })
            const resultInsertStock = await ControllerStock.multipleInsertStock(newDetFact, newFact.user_id, pvId, factId)
            return {
                status: 200,
                msg: {
                    resultinsert,
                    resultInsertStock
                }
            }
        } else {
            return {
                status: 500,
                msg: "Hubo un error al querer insertar"
            }
        }
    }

    const lastInvoice = async (pvId: number, fiscal: boolean, tipo: CbteTipos, entorno: boolean): Promise<{ lastInvoice: number }> => {
        const pvData: Array<INewPV> = await ptosVtaController.get(pvId);
        if (fiscal) {
            let certDir = "drop_test.crt"
            let keyDir = "drop.key"
            let entornoAlt = false
            if (process.env.ENTORNO === "PROD") {
                certDir = pvData[0].cert_file || "drop_test.crt"
                keyDir = pvData[0].key_file || "drop.key"
                entornoAlt = true
            }

            const afip = new AfipClass(pvData[0].cuit, certDir, keyDir, entornoAlt);
            const lastfact = await afip.lastFact(pvData[0].pv, tipo);
            if (lastfact.status === 200) {
                return {
                    lastInvoice: Number(lastfact.data)
                }
            } else {
                throw new Error("Error interno. Probablemente no sea un punto de venta válido.")
            }
        } else {
            let filter: IWhereParams | undefined = undefined;
            let filters: Array<IWhereParams> = [];

            filter = {
                mode: EModeWhere.strict,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.facturas.pv, object: String(pvData[0].pv) },
                    { column: Columns.facturas.fiscal, object: String(0) },
                    { column: Columns.facturas.cuit_origen, object: String(pvData[0].cuit) }
                ]
            };
            filters.push(filter);
            const listUlt = await store.list(Tables.FACTURAS, [`MAX(${Columns.facturas.cbte}) AS lastInvoice`], filters, undefined, undefined, undefined, undefined);
            if (listUlt[0].lastInvoice > 0) {
                return {
                    lastInvoice: listUlt[0].lastInvoice
                }
            } else {
                return {
                    lastInvoice: 0
                }
            }
        }
    }

    const getFiscalDataInvoice = async (ncbte: number, pvId: number, fiscal: boolean, tipo: CbteTipos, entorno: boolean): Promise<FactInscriptoProd |
        FactInscriptoServ |
        FactMonotribProd |
        FactMonotribServ> => {
        const pvData: Array<INewPV> = await ptosVtaController.get(pvId);

        let certDir = "drop_test.crt"
        let keyDir = "drop.key"
        let entornoAlt = false
        if (process.env.ENTORNO === "PROD") {
            certDir = pvData[0].cert_file || "drop_test.crt"
            keyDir = pvData[0].key_file || "drop.key"
            entornoAlt = true
        }

        const afip = new AfipClass(pvData[0].cuit, certDir, keyDir, entornoAlt);
        const dataInvoice = await afip.getInvoiceInfo(ncbte, pvData[0].pv, tipo);
        return dataInvoice.data
    }

    const newInvoice = async (
        pvData: INewPV,
        newFact: IFactura,
        factFiscal: FactInscriptoProd |
            FactInscriptoProdNC |
            FactInscriptoServ |
            FactInscriptoServNC |
            FactMonotribProd |
            FactMonotribProdNC |
            FactMonotribServ |
            FactMonotribServNC |
            any,
        productsList: Array<IDetFactura>,
        fileName: string,
        filePath: string,
        next: NextFunction
    ) => {

        const resultInsert = insertFact(pvData.id || 0, newFact, productsList, factFiscal)
        if (String(newFact.n_doc_cliente).length < 12 && String(newFact.n_doc_cliente).length > 6) {
            let esDni = false
            if (String(newFact.n_doc_cliente).length < 10) {
                esDni = true
            }
            const newClient: IClientes = {
                cuit: esDni,
                ndoc: String(newFact.n_doc_cliente),
                razsoc: newFact.raz_soc_cliente,
                telefono: "",
                email: newFact.email_cliente,
                cond_iva: newFact.cond_iva_cliente
            }
            try {
                ControllerClientes.upsert(newClient, next)
            } catch (error) {

            }
        }

        setTimeout(() => {
            fs.unlinkSync(filePath)
        }, 6000);

        const dataFact = {
            fileName,
            filePath,
            resultInsert
        }
        return dataFact
    }

    const getDetails = async (fact_id: number): Promise<Array<IDetFactura>> => {
        return await store.getAnyCol(Tables.DET_FACTURAS, { fact_id })
    }

    const getDataFact = async (
        fileName: string,
        filePath: string,
    ) => {
        const dataFact = {
            fileName,
            filePath
        }
        return dataFact
    }

    return {
        lastInvoice,
        list,
        remove,
        get,
        newInvoice,
        getFiscalDataInvoice,
        cajaList,
        getDetails,
        getDataFact
    }
}
