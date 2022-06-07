import { sendAvisoClienteSeller } from './../../../utils/sendEmails/sendAvisoClientsSellers';
import { INewInsert } from './../../../interfaces/Ifunctions';
import { IFactura, IMovCtaCte } from './../../../interfaces/Itables';
import { AfipClass } from './../../../utils/facturacion/AfipClass';
import { Ipages, IWhereParams } from 'interfaces/Ifunctions';
import { IClientes, IUser } from 'interfaces/Itables';
import { EConcatWhere, EModeWhere, ESelectFunct } from '../../../enums/EfunctMysql';
import { Tables, Columns } from '../../../enums/EtablesDB';
import StoreType from '../../../store/mysql';
import getPages from '../../../utils/getPages';
import { NextFunction } from 'express';
import fs from 'fs';
import { IModPriceProd } from 'interfacesold/Itables';

export = (injectedStore: typeof StoreType) => {
    let store = injectedStore;

    const list = async (page?: number, item?: string, cantPerPage?: number) => {
        let filter: IWhereParams | undefined = undefined;
        let filters: Array<IWhereParams> = [];
        if (item) {
            filter = {
                mode: EModeWhere.like,
                concat: EConcatWhere.or,
                items: [
                    { column: Columns.clientes.telefono, object: String(item) },
                    { column: Columns.clientes.email, object: String(item) },
                    { column: Columns.clientes.ndoc, object: String(item) },
                    { column: Columns.clientes.razsoc, object: String(item) }
                ]
            };
            filters.push(filter);
        }

        let pages: Ipages;
        if (page) {
            pages = {
                currentPage: page,
                cantPerPage: cantPerPage || 10,
                order: Columns.clientes.id,
                asc: true
            };
            const data = await store.list(Tables.CLIENTES, [ESelectFunct.all], filters, undefined, pages);
            const cant = await store.list(Tables.CLIENTES, [`COUNT(${ESelectFunct.all}) AS COUNT`], filters, undefined, undefined);
            const pagesObj = await getPages(cant[0].COUNT, 10, Number(page));
            return {
                data,
                pagesObj
            };
        } else {
            const data = await store.list(Tables.CLIENTES, [ESelectFunct.all], filters, undefined, undefined);
            return {
                data
            };
        }
    }

    const upsert = async (body: IClientes, next: NextFunction) => {
        const cliente: IClientes = {
            cuit: body.cuit,
            ndoc: body.ndoc,
            razsoc: body.razsoc,
            telefono: body.telefono,
            email: body.email,
            cond_iva: body.cond_iva,
            vendedor_id: body.vendedor_id,
            price_default: body.price_default,
            direccion: body.direccion
        }

        try {
            if (body.id) {
                return await store.update(Tables.CLIENTES, cliente, body.id);
            } else {
                return await store.insert(Tables.CLIENTES, cliente);
            }
        } catch (error) {
            next(error)
        }
    }

    const remove = async (idCliente: number) => {
        const listCtaCte: {
            data: Array<IMovCtaCte>
        } = await listCtaCteClient(idCliente, false, false)
        const cant = listCtaCte.data.length
        if (cant > 0) {
            return 403
        } else {
            const result: any = await store.remove(Tables.CLIENTES, { id: idCliente });

            if (result.affectedRows > 0) {
                return 200
            } else {
                return 500
            }
        }
    }

    const get = async (idCliente: number) => {
        return await store.get(Tables.CLIENTES, idCliente);
    }

    const getCuit = async (ndocClient: number) => {

        let filters: Array<IWhereParams> = [{
            mode: EModeWhere.like,
            concat: EConcatWhere.or,
            items: [
                { column: Columns.clientes.ndoc, object: String(ndocClient) }
            ]
        }];
        return await store.list(Tables.CLIENTES, ["*"], filters);
    }

    const asignarVendedor = async (sellerData: IUser, clienteData: IClientes) => {
        const resp: INewInsert = await store.update(Tables.CLIENTES, { vendedor_id: sellerData.id }, clienteData.id || 0)
        if (resp.affectedRows > 0) {
            await sendAvisoClienteSeller(sellerData, clienteData, true)
            return ""
        } else {
            throw new Error("Error desconocido")
        }
    }


    const desAsignarVendedor = async (sellerData: IUser, clienteData: IClientes) => {
        const resp: INewInsert = await store.update(Tables.CLIENTES, { vendedor_id: null }, clienteData.id || 0)
        if (resp.affectedRows > 0) {
            await sendAvisoClienteSeller(sellerData, clienteData, false)
            return ""
        } else {
            throw new Error("Error desconocido")
        }
    }

    const dataFiscalPadron = async (cuit: number, cert: string, key: string, cuitPv: number) => {
        let certDir = "drop.crt"
        let keyDir = "drop.key"
        if (process.env.ENTORNO === "PROD") {
            certDir = cert
            keyDir = key
        }
        const afip = new AfipClass(cuitPv, certDir, keyDir, true);
        const dataFiscal = await afip.getDataCUIT(cuit);
        return dataFiscal
    }

    const listCtaCteClient = async (idCliente: number, debit: boolean, credit: boolean, page?: number, cantPerPage?: number) => {

        let filter: IWhereParams | undefined = undefined;
        let filters: Array<IWhereParams> = [];

        if (!debit && !credit) {
            filter = {
                mode: EModeWhere.strict,
                concat: EConcatWhere.none,
                items: [
                    { column: Columns.ctaCte.id_cliente, object: String(idCliente) }
                ]
            };
            filters.push(filter);
        } else if (debit) {
            filter = {
                mode: EModeWhere.strict,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.ctaCte.id_cliente, object: String(idCliente) },
                ]
            };
            filters.push(filter);

            filter = {
                mode: EModeWhere.less,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.ctaCte.importe, object: String(0) },
                ]
            };
            filters.push(filter);
        } else if (credit) {
            filter = {
                mode: EModeWhere.strict,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.ctaCte.id_cliente, object: String(idCliente) },
                ]
            };
            filters.push(filter);

            filter = {
                mode: EModeWhere.higher,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.ctaCte.importe, object: String(0) },
                ]
            };
            filters.push(filter);
        }

        let pages: Ipages;
        if (page) {
            pages = {
                currentPage: page,
                cantPerPage: cantPerPage || 10,
                order: Columns.clientes.id,
                asc: false
            };
            const data = await store.list(Tables.CTA_CTE, [ESelectFunct.all], filters, undefined, pages);
            const cant = await store.list(Tables.CTA_CTE, [`COUNT(${ESelectFunct.all}) AS COUNT`], filters);
            const suma = await store.list(Tables.CTA_CTE, [`SUM(${Columns.ctaCte.importe}) as SUMA`], filters);
            const pagesObj = await getPages(cant[0].COUNT, 10, Number(page));
            return {
                data,
                pagesObj,
                suma
            };
        } else {
            const data = await store.list(Tables.CTA_CTE, [ESelectFunct.all], filters, undefined, undefined);
            const suma = await store.list(Tables.CTA_CTE, [`SUM(${Columns.ctaCte.importe}) as SUMA`], filters);
            return {
                data,
                suma
            };
        }
    }

    const registerPayment = async (
        newFact: IFactura,
        fileName: string,
        filePath: string,
        clienteData: IClientes,
        next: NextFunction
    ) => {
        const result: INewInsert = await store.insert(Tables.FACTURAS, newFact)

        if (result.affectedRows > 0) {
            const ctacteData = {
                id_cliente: clienteData.id || 0,
                id_factura: result.insertId,
                id_recibo: result.insertId,
                forma_pago: newFact.forma_pago,
                importe: (newFact.total_fact),
                detalle: "Recibo de Pago"
            }
            const resultCtaCte = await store.insert(Tables.CTA_CTE, ctacteData)

            setTimeout(() => {
                fs.unlinkSync(filePath)
            }, 6000);

            const dataFact = {
                fileName,
                filePath,
                resultInsert: resultCtaCte
            }
            return dataFact
        } else {
            throw new Error("Error interno. No se pudo registrar el nuevo recibo.")
        }
    }

    const getDataPayment = async (
        fileName: string,
        filePath: string) => {
        const dataFact = {
            fileName,
            filePath
        }
        return dataFact
    }

    const dataPrices = async () => {
        const groupBy: Array<string> = [Columns.productsPrices.type_price_name]
        return await store.list(Tables.PRODUCTS_PRICES, [Columns.productsPrices.type_price_name], undefined, groupBy)
    }

    return {
        list,
        upsert,
        remove,
        get,
        dataFiscalPadron,
        listCtaCteClient,
        registerPayment,
        getDataPayment,
        asignarVendedor,
        desAsignarVendedor,
        getCuit,
        dataPrices
    }
}
