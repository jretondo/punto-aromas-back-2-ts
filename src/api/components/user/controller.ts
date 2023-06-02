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

        /*
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
        */

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
            pv: body.pv,
            admin: 0
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
        const result: INewInsert = await store.insert(Tables.FACTURAS, newFact)

        if (result.affectedRows > 0) {
            const importe: number = - newFact.total_fact
            const idVendedor: number = newFact.id_seller_comision

            const resDataComsionPend: {
                data: Array<IFactura>,
                suma: Array<number>
            } = await listCtaCteSeller(idVendedor, true, undefined, undefined, true, true)
            const dataComsionPend = resDataComsionPend.data

            let importePend = importe

            await new Promise((resolve, reject) => {
                dataComsionPend.map(async (item, key) => {

                    const resDetComsiones: {
                        data: Array<IFactura>,
                        suma: Array<{ SUMA: number }>
                    } = await getDetailsFact(item.id || 0)

                    const comisionTotal = Number(resDetComsiones.suma[0].SUMA)
                    const comisionPaga = Number(item.comision_paga)
                    const comisionPend = Number(comisionTotal - comisionPaga)

                    if (Number(comisionPend) > importePend) {
                        const importeNvo = importePend + comisionPaga
                        importePend = 0
                        await store.update(Tables.FACTURAS, { comision_paga: (importeNvo) }, item.id || 0)
                    } else {
                        const importeNvo = comisionTotal
                        importePend = importePend - comisionPend
                        await store.update(Tables.FACTURAS, { comision_paga: (importeNvo) }, item.id || 0)
                    }
                    if (key === dataComsionPend.length - 1) {
                        resolve("")
                    }
                })
            })

            setTimeout(() => {
                fs.unlinkSync(filePath)
            }, 6000);

            const dataFact = {
                fileName,
                filePath,
                resultInsert: result
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


    const listCtaCteSeller = async (idVendedor: number, pendiente: boolean, page?: number, cantPerPage?: number, asc?: boolean, sinRec?: boolean) => {


        let filter: IWhereParams | undefined = undefined;
        let filters: Array<IWhereParams> = [];

        if (pendiente) {
            filter = {
                mode: EModeWhere.strict,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.facturas.id_seller_comision, object: String(idVendedor) },
                    { column: Columns.facturas.id_fact_asoc, object: String(0) }
                ]
            };
            filters.push(filter);

            filter = {
                mode: EModeWhere.dif,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.facturas.t_fact, object: String(-2) },
                    { column: `${Columns.facturas.comision} - ${Columns.facturas.comision_paga}`, object: String(0) },
                ]
            };
            filters.push(filter);

            filter = {
                mode: EModeWhere.higher,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.facturas.comision, object: String(0) },
                ]
            };
            filters.push(filter);
        } else {
            filter = {
                mode: EModeWhere.strict,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.facturas.id_seller_comision, object: String(idVendedor) },
                    { column: Columns.facturas.id_fact_asoc, object: String(0) }
                ]
            };
            filters.push(filter);

            filter = {
                mode: EModeWhere.dif,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.facturas.t_fact, object: String(-2) },
                ]
            };
            filters.push(filter);

            filter = {
                mode: EModeWhere.higher,
                concat: EConcatWhere.and,
                items: [
                    { column: Columns.facturas.comision, object: String(0) },
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
                asc: asc || false
            };
            const data = await store.list(Tables.FACTURAS, [ESelectFunct.all], filters, undefined, pages);
            const cant = await store.list(Tables.FACTURAS, [`COUNT(${ESelectFunct.all}) AS COUNT`], filters);
            const suma = await store.list(Tables.FACTURAS, [`SUM(${Columns.facturas.comision} - ${Columns.facturas.comision_paga}) as SUMA`], filters);

            const pagesObj = await getPages(cant[0].COUNT, 10, Number(page));
            return {
                data,
                pagesObj,
                suma
            };
        } else {
            const data = await store.list(Tables.FACTURAS, [ESelectFunct.all], filters, undefined, undefined);
            const suma = await store.list(Tables.FACTURAS, [`SUM(${Columns.facturas.comision} - ${Columns.facturas.comision_paga}) as SUMA`], filters);
            return {
                data,
                suma
            };
        }
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

        filter = {
            mode: EModeWhere.higherEqual,
            concat: EConcatWhere.and,
            items: [
                { column: Columns.facturas.comision, object: String(0) },
            ]
        };
        filters.push(filter);

        const data = await store.list(Tables.FACTURAS, [ESelectFunct.all], filters, undefined, undefined);
        const suma = await store.list(Tables.FACTURAS, [`SUM(${Columns.facturas.comision}) as SUMA`], filters);

        return {
            data,
            suma
        };
    }

    const clientsList = async (userId: number, page: number) => {
        let filter: IWhereParams | undefined = undefined;
        let filters: Array<IWhereParams> = [];
        const pages: Ipages = {
            currentPage: page,
            cantPerPage: 10,
            order: Columns.clientes.razsoc,
            asc: true
        };
        filter = {
            mode: EModeWhere.strict,
            concat: EConcatWhere.and,
            items: [
                { column: Columns.clientes.vendedor_id, object: String(userId) }
            ]
        };
        filters.push(filter);
        const data = await store.list(Tables.CLIENTES, [ESelectFunct.all], filters, undefined, pages);
        const cant = await store.list(Tables.CLIENTES, [`COUNT(${ESelectFunct.all}) AS COUNT`], filters, undefined, undefined);
        const pagesObj = await getPages(cant[0].COUNT, 10, Number(page));
        return {
            data,
            pagesObj
        };
    }

    const deleteClient = async (clientId: number) => {
        const result: INewInsert = await store.update(Tables.CLIENTES, { vendedor_id: null }, clientId)
        if (result.affectedRows > 0) {
            return ""
        }
        throw Error("Hubo un error!")
    }

    return {
        list,
        upsert,
        remove,
        getUser,
        sellerList,
        listCtaCteSeller,
        registerPayment,
        getDataPayment,
        getDetailsFact,
        clientsList,
        deleteClient
    }
}
