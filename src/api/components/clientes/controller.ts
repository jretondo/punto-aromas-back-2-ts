import { ImodifyFactPay } from './../../../interfaces/Irequests';
import { sendAvisoClienteSeller } from './../../../utils/sendEmails/sendAvisoClientsSellers';
import { INewInsert } from './../../../interfaces/Ifunctions';
import { IFactura } from './../../../interfaces/Itables';
import { AfipClass } from './../../../utils/facturacion/AfipClass';
import { Ipages, IWhereParams } from 'interfaces/Ifunctions';
import { IClientes, IUser } from 'interfaces/Itables';
import { EConcatWhere, EModeWhere, ESelectFunct } from '../../../enums/EfunctMysql';
import { Tables, Columns } from '../../../enums/EtablesDB';
import StoreType from '../../../store/mysql';
import getPages from '../../../utils/getPages';
import { NextFunction } from 'express';
import fs from 'fs';

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
        /*
        
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
        */
        return 500
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

    const getCuit2 = async (ndocClient: number) => {
        console.log('ndocClient :>> ', ndocClient);
        let filters: Array<IWhereParams> = [{
            mode: EModeWhere.strict,
            concat: EConcatWhere.none,
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

    const listCtaCteClient = async (cuit: number, pendiente: boolean, page?: number, cantPerPage?: number) => {

        let filter: IWhereParams | undefined = undefined;
        let filters: Array<IWhereParams> = [];

        if (pendiente) {
            filter = {
                mode: EModeWhere.strict,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.facturas.n_doc_cliente, object: String(cuit) },
                    { column: Columns.facturas.cancelada, object: String(0) },
                    { column: Columns.facturas.nota_cred, object: String(0) }
                ]
            };
            filters.push(filter);

            filter = {
                mode: EModeWhere.dif,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.facturas.t_fact, object: String(-1) },
                    { column: Columns.facturas.t_fact, object: String(-2) },
                ]
            };
            filters.push(filter);

            filter = {
                mode: EModeWhere.higher,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.facturas.monto_cta_cte, object: String(0) },
                ]
            };
            filters.push(filter);
        } else {
            filter = {
                mode: EModeWhere.strict,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.facturas.n_doc_cliente, object: String(cuit) },
                    { column: Columns.facturas.nota_cred, object: String(0) }
                ]
            };
            filters.push(filter);

            filter = {
                mode: EModeWhere.dif,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.facturas.t_fact, object: String(-1) },
                    { column: Columns.facturas.t_fact, object: String(-2) },
                ]
            };
            filters.push(filter);

            filter = {
                mode: EModeWhere.higher,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.facturas.monto_cta_cte, object: String(0) },
                ]
            };
            filters.push(filter);
        }

        let pages: Ipages;
        if (page) {
            pages = {
                currentPage: page,
                cantPerPage: cantPerPage || 10,
                order: Columns.facturas.id,
                asc: false
            };
            const data = await store.list(Tables.FACTURAS, [ESelectFunct.all], filters, undefined, pages);
            const cant = await store.list(Tables.FACTURAS, [`COUNT(${ESelectFunct.all}) AS COUNT`], filters);
            const suma = await store.list(Tables.FACTURAS, [`SUM(${Columns.facturas.monto_cta_cte} - ${Columns.facturas.monto_pago_cta_cte}) as SUMA`], filters);
            const pagesObj = await getPages(cant[0].COUNT, 10, Number(page));
            return {
                data,
                pagesObj,
                suma
            };
        } else {
            const data = await store.list(Tables.FACTURAS, [ESelectFunct.all], filters, undefined, undefined);
            const suma = await store.list(Tables.FACTURAS, [`SUM(${Columns.facturas.monto_cta_cte} - ${Columns.facturas.monto_pago_cta_cte}) as SUMA`], filters);
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
        modifyFact: ImodifyFactPay
    ) => {
        const resultInsert: INewInsert = await store.insert(Tables.FACTURAS, newFact);
        setTimeout(() => {
            fs.unlinkSync(filePath)
        }, 6000);

        if (resultInsert.affectedRows > 0) {
            await store.update(Tables.FACTURAS, modifyFact, newFact.id_fact_asoc)
        }

        const dataFact = {
            fileName,
            filePath,
            resultInsert
        }
        return dataFact
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

    const getDetailsFact = async (idFact: number) => {
        let filter: IWhereParams | undefined = undefined;
        let filters: Array<IWhereParams> = [];

        filter = {
            mode: EModeWhere.strict,
            concat: EConcatWhere.or,
            items: [
                { column: Columns.facturas.id_fact_asoc, object: String(idFact) },
                { column: Columns.facturas.id, object: String(idFact) }
            ]
        };
        filters.push(filter);

        const data = await store.list(Tables.FACTURAS, [ESelectFunct.all], filters, undefined, undefined);
        const suma = await store.list(Tables.FACTURAS, [`SUM(${Columns.facturas.monto_cta_cte}) as SUMA`], filters);
        return {
            data,
            suma
        };
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
        getDetailsFact,
        getCuit2
    }
}
