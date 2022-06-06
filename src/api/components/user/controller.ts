import { IVendedoresCtaCte } from './../../../interfaces/Itables';
import { INewInsert } from './../../../interfaces/Ifunctions';
import { NextFunction } from 'express';
import { Ipages, IWhereParams } from 'interfaces/Ifunctions';
import { Iauth, IUser, IFactura } from 'interfaces/Itables';
import { EConcatWhere, EModeWhere, ESelectFunct } from '../../../enums/EfunctMysql';
import { Tables, Columns } from '../../../enums/EtablesDB';
import StoreType from '../../../store/mysql';
import getPages from '../../../utils/getPages';
import Authcontroller from '../auth/index';
import fs from 'fs';

export = (injectedStore: typeof StoreType) => {
    let store = injectedStore;

    const list = async (page?: number, item?: string, cantPerPage?: number, idUsu?: number) => {

        const filters: Array<IWhereParams> | undefined = [];
        if (item) {
            const filter: IWhereParams | undefined = {
                mode: EModeWhere.like,
                concat: EConcatWhere.or,
                items: [
                    { column: Columns.admin.apellido, object: String(item) },
                    { column: Columns.admin.email, object: String(item) },
                    { column: Columns.admin.nombre, object: String(item) },
                    { column: Columns.admin.usuario, object: String(item) }
                ]
            };
            filters.push(filter);
        }

        if (idUsu) {
            const filter: IWhereParams | undefined = {
                mode: EModeWhere.dif,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.admin.id, object: String(idUsu) }
                ]
            };
            filters.push(filter);
        }

        let pages: Ipages;
        if (page) {
            pages = {
                currentPage: page,
                cantPerPage: cantPerPage || 10,
                order: Columns.admin.id,
                asc: true
            };
            const data = await store.list(Tables.ADMIN, [ESelectFunct.all], filters, undefined, pages);
            const cant = await store.list(Tables.ADMIN, [`COUNT(${ESelectFunct.all}) AS COUNT`], filters, undefined, undefined);
            const pagesObj = await getPages(cant[0].COUNT, 10, Number(page));
            return {
                data,
                pagesObj
            };
        } else {
            const data = await store.list(Tables.ADMIN, [ESelectFunct.all], filters, undefined, undefined);
            return {
                data
            };
        }
    }

    const sellerList = async () => {
        const filters: Array<IWhereParams> | undefined = [];
        const filter: IWhereParams | undefined = {
            mode: EModeWhere.dif,
            concat: EConcatWhere.none,
            items: [
                { column: Columns.admin.pv, object: String("") },
            ]
        };
        filters.push(filter);
        const data = await store.list(Tables.ADMIN, [ESelectFunct.all], filters, undefined, undefined);
        return {
            data
        };
    }

    const upsert = async (body: IUser) => {
        const user: IUser = {
            nombre: body.nombre,
            apellido: body.apellido,
            email: body.email,
            usuario: body.usuario,
            pv: body.pv
        }

        if (body.id) {
            return await store.update(Tables.ADMIN, user, body.id);
        } else {
            const result = await store.insert(Tables.ADMIN, user);
            const newAuth: Iauth = {
                id: result.insertId,
                usuario: user.usuario,
                prov: 1
            }
            return await Authcontroller.upsert(newAuth, body.email);
        }
    }

    const remove = async (idUser: number) => {
        await store.remove(Tables.ADMIN, { id: idUser })
            .then(async (result: any) => {
                if (result.affectedRows > 0) {
                    await store.remove(Tables.AUTH_ADMIN, { id: idUser })
                } else {
                    throw new Error();
                }
            })
    }

    const getUser = async (idUser: number): Promise<Array<IUser>> => {
        return await store.get(Tables.ADMIN, idUser);
    }

    const registerPayment = async (
        newFact: IFactura,
        fileName: string,
        filePath: string,
        sellerData: IUser,
        ultRbo: number,
        next: NextFunction
    ) => {

        const result: INewInsert = await store.insert(Tables.RECIBOS_VENDEDORES, newFact)

        if (result.affectedRows > 0) {
            const ctacteData: IVendedoresCtaCte = {
                id_vendedor: sellerData.id || 0,
                id_factura: result.insertId,
                id_recibo: result.insertId,
                forma_pago: newFact.forma_pago,
                importe: (newFact.total_fact),
                detalle: "Recibo de Pago"
            }
            const resultCtaCte = await store.insert(Tables.VENDEDORES_CTA_CTE, ctacteData)

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


    const listCtaCteSeller = async (idVendedor: number, debit: boolean, credit: boolean, page?: number, cantPerPage?: number) => {

        let filter: IWhereParams | undefined = undefined;
        let filters: Array<IWhereParams> = [];

        if (!debit && !credit) {
            filter = {
                mode: EModeWhere.strict,
                concat: EConcatWhere.none,
                items: [
                    { column: Columns.vendedores_cta_cte.id_vendedor, object: String(idVendedor) }
                ]
            };
            filters.push(filter);
        } else if (debit) {
            filter = {
                mode: EModeWhere.strict,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.vendedores_cta_cte.id_vendedor, object: String(idVendedor) },
                ]
            };
            filters.push(filter);

            filter = {
                mode: EModeWhere.less,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.vendedores_cta_cte.importe, object: String(0) },
                ]
            };
            filters.push(filter);
        } else if (credit) {
            filter = {
                mode: EModeWhere.strict,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.vendedores_cta_cte.id_vendedor, object: String(idVendedor) },
                ]
            };
            filters.push(filter);

            filter = {
                mode: EModeWhere.higher,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.vendedores_cta_cte.importe, object: String(0) },
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
            const data = await store.list(Tables.VENDEDORES_CTA_CTE, [ESelectFunct.all], filters, undefined, pages);
            const cant = await store.list(Tables.VENDEDORES_CTA_CTE, [`COUNT(${ESelectFunct.all}) AS COUNT`], filters);
            const suma = await store.list(Tables.VENDEDORES_CTA_CTE, [`SUM(${Columns.ctaCte.importe}) as SUMA`], filters);
            const pagesObj = await getPages(cant[0].COUNT, 10, Number(page));
            return {
                data,
                pagesObj,
                suma
            };
        } else {
            const data = await store.list(Tables.VENDEDORES_CTA_CTE, [ESelectFunct.all], filters, undefined, undefined);
            const suma = await store.list(Tables.VENDEDORES_CTA_CTE, [`SUM(${Columns.ctaCte.importe}) as SUMA`], filters);
            return {
                data,
                suma
            };
        }
    }

    return {
        list,
        upsert,
        remove,
        getUser,
        sellerList,
        listCtaCteSeller,
        registerPayment,
        getDataPayment
    }
}
