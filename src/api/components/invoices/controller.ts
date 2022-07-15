import { ETypesJoin } from '../../../enums/EfunctMysql';
import { MetodosPago } from './../../../enums/EtablesDB';
import { sendAvisoFact } from './../../../utils/sendEmails/sendAvisoFact';
import { IFormasPago, IProdPrinc } from './../../../interfaces/Itables';
import { createListSellsPDF } from './../../../utils/facturacion/lists/createListSellsPDF';
import { EConcatWhere, EModeWhere, ESelectFunct } from '../../../enums/EfunctMysql';
import { Tables, Columns } from '../../../enums/EtablesDB';
import StoreType from '../../../store/mysql';
import getPages from '../../../utils/getPages';
import {
    AfipClass,
    CbteTipos,
    FactInscriptoProd
} from '../../../utils/facturacion/AfipClass'
import ptosVtaController from '../ptosVta';
import { Ipages, IWhereParams, IJoin, Iorder } from 'interfaces/Ifunctions';
import { IClientes, IDetFactura, IFactura, IUser, IModPriceProd } from 'interfaces/Itables';
import { ImodifyCtaCte, INewPV } from 'interfaces/Irequests';
import ControllerStock from '../stock';
import ControllerClientes from '../clientes';
import fs from 'fs';
import { NextFunction } from 'express';
import controller from '../clientes';
import { zfill } from '../../../utils/cerosIzq';
import { formatMoney } from '../../../utils/formatMoney';

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

    const cajaList = async (pdf: boolean, userId: number, ptoVtaId: number, desde: string, hasta: string, user: IUser, page?: number, cantPerPage?: number): Promise<any> => {

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

        const filter3: IWhereParams = {
            mode: EModeWhere.dif,
            concat: EConcatWhere.none,
            items: [
                { column: Columns.facturas.forma_pago, object: String(4) }
            ]
        }

        filters.push(filter1, filter2)

        let pages: Ipages;

        const joinQuery: IJoin = {
            table: Tables.FORMAS_PAGO,
            colJoin: Columns.formasPago.id_fact,
            colOrigin: Columns.facturas.id,
            type: ETypesJoin.left
        };

        if (page) {
            pages = {
                currentPage: page,
                cantPerPage: cantPerPage || 10,
                order: Columns.facturas.id,
                asc: true
            };
            const totales = await store.list(Tables.FACTURAS, [`SUM(${Columns.facturas.total_fact}) AS SUMA`, Columns.facturas.forma_pago], filters, [Columns.facturas.forma_pago], undefined);
            const totales2 = await store.list(Tables.FACTURAS, [`SUM(${Columns.formasPago.importe}) AS SUMA`, Columns.formasPago.tipo], filters, [Columns.formasPago.tipo], undefined, [joinQuery]);
            const totalCosto = await store.list(Tables.FACTURAS, [`SUM(${Columns.facturas.total_compra}) AS COMPRA`], [...filters, filter3])
            const totalCosto2 = await store.list(Tables.FACTURAS, [`SUM(${Columns.facturas.total_compra}) AS COMPRA`], filters)
            const data = await store.list(Tables.FACTURAS, [ESelectFunct.all], filters, undefined, pages, undefined, { columns: [Columns.facturas.fecha], asc: false });
            const cant = await store.list(Tables.FACTURAS, [`COUNT(${ESelectFunct.all}) AS COUNT`], filters, undefined, undefined);
            const pagesObj = await getPages(cant[0].COUNT, 10, Number(page));

            return {
                data,
                pagesObj,
                totales,
                totales2,
                totalCosto: totalCosto[0].COMPRA,
                totalCosto2: totalCosto2[0].COMPRA
            };
        } else {
            const totales = await store.list(Tables.FACTURAS, [`SUM(${Columns.facturas.total_fact}) AS SUMA`, Columns.facturas.forma_pago], filters, [Columns.facturas.forma_pago], undefined, [joinQuery]);
            const totales2 = await store.list(Tables.FACTURAS, [`SUM(${Columns.formasPago.importe}) AS SUMA`, Columns.formasPago.tipo], filters, [Columns.formasPago.tipo], undefined, [joinQuery]);
            const totalCosto = await store.list(Tables.FACTURAS, [`SUM(${Columns.facturas.total_compra}) AS COMPRA`], [...filters, filter3])
            const totalCosto2 = await store.list(Tables.FACTURAS, [`SUM(${Columns.facturas.total_compra}) AS COMPRA`], filters)
            const data = await store.list(Tables.FACTURAS, [ESelectFunct.all], filters, undefined, undefined, undefined, { columns: [Columns.facturas.fecha], asc: false });

            if (pdf) {
                const cajaList = await createListSellsPDF(userId, ptoVtaId, desde, hasta, totales, totales2, totalCosto[0].COMPRA, data, user)
                return cajaList
            } else {
                return {
                    data,
                    totales,
                    totalCosto: totalCosto[0].COMPRA,
                    totalCosto2: totalCosto2[0].COMPRA
                };
            }
        }
    }

    const get = async (id: number) => {
        return await store.get(Tables.FACTURAS, id);
    }

    const get2 = async (id: number) => {
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
            FactMonotribServNC): Promise<any> => {

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
            const resultInsertStock = await ControllerStock.multipleInsertStock(newDetFact, newFact.user_id, pvId, factId, newFact.total_fact < 0 ? true : false)
            return {
                status: 200,
                msg: {
                    resultinsert,
                    resultInsertStock,
                    factId
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
        timer: number,
        userData: IUser,
        variosPagos: Array<{
            tipo: MetodosPago,
            tipo_txt: string,
            importe: number
        }>,
        next: NextFunction
    ) => {
        const resultInsert = await insertFact(pvData.id || 0, newFact, productsList, factFiscal)
        const clienteArray: { data: Array<IClientes> } = await controller.list(undefined, String(newFact.n_doc_cliente), undefined)

        if (clienteArray.data.length === 0) {
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
                    cond_iva: newFact.cond_iva_cliente,
                    direccion: ""
                }
                try {
                    await ControllerClientes.upsert(newClient, next)
                } catch (error) {
                    console.log('error :>> ', error);
                }
            }
        }

        if (Number(newFact.forma_pago) === 5) {
            variosPagos.map(async item => {
                const dataForma: IFormasPago = {
                    id_fact: resultInsert.msg.factId,
                    tipo: item.tipo,
                    importe: (Math.round(item.importe * 100)) / 100,
                    tipo_txt: item.tipo_txt
                }
                await store.insert(Tables.FORMAS_PAGO, dataForma)
            })
        }

        if (newFact.id_fact_asoc !== 0) {
            await store.update(Tables.FACTURAS, { id_fact_asoc: resultInsert.msg.factId }, newFact.id_fact_asoc)
        }

        setTimeout(() => {
            fs.unlinkSync(filePath)
        }, 6000);

        const difTime = Number(new Date()) - timer

        if (difTime > 5000) {
            sendAvisoFact(
                `${newFact.letra} ${zfill(newFact.pv, 5)} - ${zfill(newFact.cbte, 8)}`,
                newFact.nota_cred,
                newFact.total_fact,
                String(userData.email),
                newFact.forma_pago === 0 ? "Efectivo" :
                    newFact.forma_pago === 1 ? "Mercado Pago" :
                        newFact.forma_pago === 2 ? "Débito" :
                            newFact.forma_pago === 3 ? "Crédito" :
                                newFact.forma_pago === 4 ? "Cuenta Corriente" : "Varios",
                userData,
                newFact.raz_soc_cliente,
                newFact.tipo_doc_cliente,
                newFact.n_doc_cliente
            )
        }
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

        setTimeout(() => {
            fs.unlinkSync(filePath)
        }, 6000);

        return dataFact
    }

    const changePayType = async (idPay: number, idType: number) => {
        return await store.update(Tables.FACTURAS, { forma_pago: idType }, idPay)
    }

    const getFormasPago = async (idFact: number) => {
        const filter: Array<IWhereParams> = [{
            mode: EModeWhere.strict,
            concat: EConcatWhere.none,
            items: [
                { column: Columns.formasPago.id_fact, object: String(idFact) }
            ]
        }];

        return await store.list(Tables.FORMAS_PAGO, ["*"], filter)
    }

    const dummyServers = async (certFile: string, keyFile: string, cuit: number) => {
        let certDir = "drop_test.crt"
        let keyDir = "drop.key"
        let entornoAlt = false

        if (process.env.ENTORNO === "PROD") {
            certDir = certFile || "drop_test.crt"
            keyDir = keyFile || "drop.key"
            entornoAlt = true
        }
        const nowTime = Number(new Date())
        const afip = new AfipClass(cuit, certDir, keyDir, entornoAlt);
        const dummy = await afip.getServerStatusFact()
        const afterTime = Number(new Date())
        const difference = afterTime - nowTime
        return {
            statusDummy: dummy,
            difference: difference
        }
    }

    const correctorNC = async () => {
        const filtersNC: Array<IWhereParams> = [{
            mode: EModeWhere.strict,
            concat: EConcatWhere.and,
            items: [
                { column: Columns.facturas.nota_cred, object: String(1) }
            ]
        }];

        const listNC: Array<IFactura> = await store.list(Tables.FACTURAS, ["*"], filtersNC)

        listNC.map(async item => {
            const idNC = item.id
            const idFact = item.id_fact_asoc

            await store.update(Tables.FACTURAS, { id_fact_asoc: idNC }, idFact)

        })

        return {
            listNC
        }
    }


    const correctorFacturas = async () => {
        const filters1: Array<IWhereParams> = []
        const filters2: Array<IWhereParams> = []

        const filter0: IWhereParams = {
            mode: EModeWhere.dif,
            concat: EConcatWhere.and,
            items: [
                { column: Columns.facturas.id_seller_comision, object: String(0) }
            ]
        };
        const filter1: IWhereParams = {
            mode: EModeWhere.dif,
            concat: EConcatWhere.and,
            items: [
                { column: Columns.facturas.forma_pago, object: String(4) }
            ]
        };
        const filter2: IWhereParams = {
            mode: EModeWhere.strict,
            concat: EConcatWhere.and,
            items: [
                { column: Columns.facturas.nota_cred, object: String(0) },
                { column: Columns.facturas.id_fact_asoc, object: String(0) },
            ]
        };
        const filter3: IWhereParams = {
            mode: EModeWhere.strict,
            concat: EConcatWhere.and,
            items: [
                { column: Columns.facturas.forma_pago, object: String(4) }
            ]
        };

        filters1.push(filter1, filter2, filter0)
        filters2.push(filter3, filter2, filter0)

        const FacturasPagas: Array<IFactura> = await store.list(Tables.FACTURAS, ["*"], filters1)
        const FacturasCtaCte: Array<IFactura> = await store.list(Tables.FACTURAS, ["*"], filters2)


        /*
        
          FacturasPagas.map(async (item1, key) => {
  
              const totalCosto = item1.costo_imputar
              const totalFact = item1.total_fact
              const detFacturas: Array<IDetFactura> = await store.get(Tables.DET_FACTURAS, item1.id || 0, Columns.detallesFact.fact_id)
              let totalComision = 0
              detFacturas.map(async (item2, key) => {
                  const cant = item2.cant_prod
                  const totalProd = item2.total_prod
                  const prodData: Array<IProdPrinc> = await store.get(Tables.PRODUCTS_PRINCIPAL, item2.id_prod, Columns.prodPrincipal.id_prod)
  
                  try {
                      const revendedor = cant * (prodData[0].revendedor)
  
                      console.log('revendedor :>> ', revendedor);
                      console.log('totalProd :>> ', totalProd);
  
                      totalComision = Number(totalComision) + (Number(totalProd) - Number(revendedor))
  
                      if (key === detFacturas.length - 1) {
                          totalComision = (Math.round(totalComision * 100) / 100)
  
                          const data: ImodifyCtaCte = {
                              costo_imputar: 0,
                              monto_cta_cte: 0,
                              comision_imputar: 0,
                              comision_total: totalComision,
                              total_compra: totalCosto,
                              comision: totalComision
                          }
  
                          await store.update(Tables.FACTURAS, { comision: totalComision, comision_total: totalComision }, item1.id || 0)
                          console.log('total_fact :>> ', item1.total_fact);
                          console.log('total_compra :>> ', item1.total_compra);
                          console.log('totalComision :>> ', (Math.round(totalComision * 100)) / 100);
                          console.log('ganancia :>> ', (item1.total_fact - item1.total_compra - totalComision));
                          console.log('__________________________________________________');
                      }
                  } catch (error) {
                      console.log('prod_id :>> ', item2.id_prod);
                      console.log('factura_id :>> ', item1.id);
                      console.log('id_seller_comision :>> ', item1.id_seller_comision);
                      console.log('Factura :>> ', `${item1.letra} ${item1.pv} - ${item1.cbte}`);
                      console.log('total factura :>> ', formatMoney(item1.total_fact));
                      console.log('__________________________________________________');
                  }
              })
          })
        */



        FacturasCtaCte.map(async (item1, key) => {
            const totalCosto = item1.total_compra
            const totalFact = item1.total_fact
            const detFacturas: Array<IDetFactura> = await store.get(Tables.DET_FACTURAS, item1.id || 0, Columns.detallesFact.fact_id)
            let totalComision = 0
            detFacturas.map(async (item2, key) => {
                const cant = item2.cant_prod
                const totalProd = item2.total_prod

                const prodData: Array<IProdPrinc> = await store.get(Tables.PRODUCTS_PRINCIPAL, item2.id_prod, Columns.prodPrincipal.id_prod)

                try {
                    const revendedor = cant * (prodData[0].revendedor)

                    totalComision = Number(totalComision) + (Number(totalProd) - Number(revendedor))

                    if (key === detFacturas.length - 1) {

                        totalComision = (Math.round(totalComision * 100) / 100)

                        const data: ImodifyCtaCte = {
                            costo_imputar: totalCosto,
                            monto_cta_cte: totalFact,
                            comision_imputar: totalComision,
                            comision_total: totalComision,
                            total_compra: 0,
                            comision: 0
                        }

                        await store.update(Tables.FACTURAS, data, item1.id || 0)

                    }
                } catch (error) {
                    //console.log('error :>> ', error);
                    console.log('prod_id :>> ', item2.id_prod);
                    console.log('factura_id :>> ', item1.id);
                    console.log('id_seller_comision :>> ', item1.id_seller_comision);
                    console.log('Factura :>> ', `${item1.letra} ${item1.pv} - ${item1.cbte}`);
                    console.log('total factura :>> ', formatMoney(item1.total_fact));
                    console.log('__________________________________________________');

                }
            })
        })

        return {
            FacturasPagas,
            FacturasCtaCte
        }
    }

    const asignarIdSeller = async () => {
        const filters1: Array<IWhereParams> = []
        const filter2: IWhereParams = {
            mode: EModeWhere.strict,
            concat: EConcatWhere.and,
            items: [
                { column: Columns.facturas.nota_cred, object: String(0) },
                { column: Columns.facturas.id_fact_asoc, object: String(0) },
            ]
        };
        const filter1: IWhereParams = {
            mode: EModeWhere.dif,
            concat: EConcatWhere.and,
            items: [
                { column: Columns.facturas.n_doc_cliente, object: String(0) }
            ]
        };
        filters1.push(filter2, filter1)

        const Facturas: Array<IFactura> = await store.list(Tables.FACTURAS, ["*"], filters1)

        Facturas.map(async (item, key) => {
            const ndoc = item.n_doc_cliente
            console.log('ndoc :>> ', ndoc);
            const dataClient: Array<IClientes> = await store.get(Tables.CLIENTES, ndoc, Columns.clientes.ndoc)
            if (dataClient.length > 0) {
                const sellerID = dataClient[0].vendedor_id
                const result = await store.update(Tables.FACTURAS, { id_seller_comision: sellerID }, item.id || 0)
                console.log('result :>> ', result);
                console.log('key :>> ', key);
            }
            if (key === Facturas.length - 1) {
                return Facturas
            }
        })
    }

    const cobrarRecibos = async () => {

        const clientes: Array<IClientes> = await store.list(Tables.CLIENTES, [`${Columns.clientes.ndoc}`], undefined, [Columns.clientes.ndoc])

        const clientes2 = [{
            ndoc: "26411300"
        }]

        return new Promise((resolve, reject) => {
            clientes.map(async (cliente, key1) => {
                const ndoc = cliente.ndoc

                const filter2: Array<IWhereParams> = [{
                    mode: EModeWhere.strict,
                    concat: EConcatWhere.and,
                    items: [
                        { column: Columns.facturas.t_fact, object: String(-1) },
                        { column: Columns.facturas.id_fact_asoc, object: String(0) },
                        { column: Columns.facturas.n_doc_cliente, object: String(ndoc) },
                    ]
                }];


                const dataRecibos: Array<{ SUMA: number }> = await store.list(Tables.FACTURAS, [`${Columns.facturas.n_doc_cliente}`, `SUM(${Columns.facturas.total_fact}) as SUMA`], filter2, [`${Columns.facturas.n_doc_cliente}`])

                if (dataRecibos.length > 0) {
                    console.log('dataRecibos :>> ', dataRecibos);
                    const totalRecibos = dataRecibos[0].SUMA

                    const filter3: Array<IWhereParams> = [{
                        mode: EModeWhere.strict,
                        concat: EConcatWhere.and,
                        items: [
                            { column: Columns.facturas.id_fact_asoc, object: String(0) },
                            { column: Columns.facturas.n_doc_cliente, object: String(ndoc) },
                            { column: Columns.facturas.forma_pago, object: String(4) }
                        ]
                    }, {
                        mode: EModeWhere.higherEqual,
                        concat: EConcatWhere.and,
                        items: [
                            { column: Columns.facturas.t_fact, object: String(0) }
                        ]
                    }];

                    const orden: Iorder = {
                        columns: [Columns.facturas.id],
                        asc: true
                    }

                    const dataFact: Array<IFactura> = await store.list(Tables.FACTURAS, ["*"], filter3, undefined, undefined, undefined, orden)

                    let reciboPendiente: number = totalRecibos

                    dataFact.map(async (factura, key2) => {
                        const totalFactura: number = factura.total_fact
                        const totalCosto: number = factura.total_compra + factura.costo_imputar
                        console.log('________________________________________');
                        console.log('totalFactura :>> ', totalFactura);
                        console.log('totalCosto :>> ', totalCosto);
                        console.log('reciboPendiente :>> ', reciboPendiente);

                        if (reciboPendiente > 0) {
                            if (Number(totalFactura) <= Number(reciboPendiente)) {
                                const data = {
                                    total_compra: totalCosto,
                                    costo_total: totalCosto,
                                    monto_pago_cta_cte: totalFactura,
                                    monto_cta_cte: totalFactura,
                                    cancelada: true
                                }
                                reciboPendiente = reciboPendiente - totalFactura
                                await store.update(Tables.FACTURAS, data, factura.id || 0)
                            } else {
                                const porcentaje = ((reciboPendiente) / totalFactura)
                                console.log('porcentaje :>> ', porcentaje);
                                const costo = (Math.round(totalCosto * porcentaje * 100)) / 100
                                console.log('costo :>> ', costo);
                                const costoImputar = totalCosto - costo
                                console.log('costoImputar :>> ', costoImputar);

                                const data = {
                                    total_compra: (Math.round(costo * 100)) / 100,
                                    costo_total: (Math.round(totalCosto * 100)) / 100,
                                    monto_pago_cta_cte: (Math.round(reciboPendiente * 100)) / 100,
                                    monto_cta_cte: (Math.round(totalFactura * 100)) / 100,
                                    costo_imputar: (Math.round(costoImputar * 100)) / 100,
                                    cancelada: false
                                }
                                reciboPendiente = 0
                                await store.update(Tables.FACTURAS, data, factura.id || 0)
                            }
                        } else {
                            const data = {
                                total_compra: 0,
                                costo_total: totalCosto,
                                monto_pago_cta_cte: 0,
                                monto_cta_cte: totalFactura,
                                costo_imputar: totalCosto,
                                cancelada: false
                            }
                            await store.update(Tables.FACTURAS, data, factura.id || 0)
                        }
                    })
                }

                if (key1 === clientes.length - 1) {
                    resolve("Finalizado")
                }

            })
        })
    }

    const verConDeuda = async () => {
        const filter1: Array<IWhereParams> = [{
            mode: EModeWhere.dif,
            concat: EConcatWhere.none,
            items: [
                { column: `${Tables.FACTURAS}.${Columns.facturas.monto_cta_cte} - ${Tables.FACTURAS}.${Columns.facturas.monto_pago_cta_cte}`, object: String(0) },
            ]
        }];

        const joinQuery: IJoin = {
            table: Tables.CLIENTES,
            colOrigin: Columns.facturas.n_doc_cliente,
            colJoin: Columns.clientes.ndoc,
            type: ETypesJoin.none
        }

        const clientesDeuda = await store.list(Tables.FACTURAS, ["*", `SUM(${Tables.FACTURAS}.${Columns.facturas.monto_cta_cte} - ${Tables.FACTURAS}.${Columns.facturas.monto_pago_cta_cte}) AS SUMA`], filter1, [`${Tables.FACTURAS}.${Columns.facturas.n_doc_cliente}`], undefined, [joinQuery])

        return clientesDeuda
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
        getDataFact,
        changePayType,
        dummyServers,
        correctorNC,
        getFormasPago,
        get2,
        correctorFacturas,
        asignarIdSeller,
        cobrarRecibos,
        verConDeuda
    }
}
