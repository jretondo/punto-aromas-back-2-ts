import { EConcatWhere, EModeWhere, ESelectFunct, ETypesJoin } from '../../../enums/EfunctMysql';
import { Tables, Columns } from '../../../enums/EtablesDB';
import StoreType from '../../../store/mysql';
import getPages from '../../../utils/getPages';
import path from 'path';
import fs from 'fs';
import { staticFolders } from '../../../enums/EStaticFiles';
import OptimizeImg from '../../../utils/optimeImg';
import { IJoin, Ipages, IWhere, IWhereParams } from 'interfaces/Ifunctions';
import { INewPriceProduct, INewProduct, INewProductOnly, INewPV } from 'interfaces/Irequests';
import { IImgProd } from 'interfaces/Itables';

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
                    { column: Columns.prodPrincipal.name, object: String(item) },
                    { column: Columns.prodPrincipal.subcategory, object: String(item) },
                    { column: Columns.prodPrincipal.category, object: String(item) },
                    { column: Columns.prodPrincipal.short_decr, object: String(item) },
                    { column: Columns.prodPrincipal.cod_barra, object: String(item) }
                ]
            };
            filters.push(filter);
        }

        const groupBy: Array<string> = [Columns.prodImg.id_prod];

        const joinQuery: IJoin = {
            table: Tables.PRODUCTS_IMG,
            colJoin: Columns.prodImg.id_prod,
            colOrigin: Columns.prodPrincipal.id,
            type: ETypesJoin.left
        };

        let pages: Ipages;
        if (page) {
            pages = {
                currentPage: page,
                cantPerPage: cantPerPage || 10,
                order: Columns.prodImg.id_prod,
                asc: true
            };
            const data = await store.list(Tables.PRODUCTS_PRINCIPAL, [ESelectFunct.all], filters, groupBy, pages, joinQuery);
            const cant = await store.list(Tables.PRODUCTS_PRINCIPAL, [`COUNT(${ESelectFunct.all}) AS COUNT`], filters);
            const pagesObj = await getPages(cant[0].COUNT, 10, Number(page));
            return {
                data,
                pagesObj
            };
        } else {
            const data = await store.list(Tables.PRODUCTS_PRINCIPAL, [ESelectFunct.all], filters, undefined, undefined, joinQuery);
            return {
                data
            };
        }
    }

    const upsertPrices = async (prices: Array<INewPriceProduct>, update: boolean, buyPrice: number, name: string) => {

        if (prices.length > 0) {
            if (update) {
                await store.remove(Tables.PRODUCTS_PRICES, { global_name: name })
                prices.map(async (price) => {
                    const newPrice: INewPriceProduct = {
                        buy_price: buyPrice,
                        percentage_sell: price.percentage_sell,
                        iva: 0,
                        sell_price: price.sell_price,
                        round: price.round,
                        type_price_name: price.type_price_name,
                        min: price.min,
                        discount: 0,
                        global_name: name
                    }
                    await store.insert(Tables.PRODUCTS_PRICES, newPrice)
                })
            } else {
                prices.map(async (price) => {
                    const newPrice: INewPriceProduct = {
                        buy_price: buyPrice,
                        percentage_sell: price.percentage_sell,
                        iva: 0,
                        sell_price: price.sell_price,
                        round: price.round,
                        type_price_name: price.type_price_name,
                        min: price.min,
                        discount: 0,
                        global_name: name
                    }
                    await store.insert(Tables.PRODUCTS_PRICES, newPrice)
                })
            }
        }
    }

    const upsert = async (body: INewProduct, listImgDelete?: Array<string>) => {

        const product: INewProduct = {
            name: body.name,
            short_descr: body.short_descr,
            category: body.category,
            subcategory: body.subcategory,
            unidad: body.unidad,
            precio_compra: body.precio_compra,
            prices: JSON.parse(String(body.prices)),
            variedades: JSON.parse(String(body.variedades)),
            global_name: body.global_name
        }

        if (body.id) {
            await upsertPrices(product.prices, true, body.precio_compra, body.global_name)
            product.variedades.map(async (variedad, key) => {
                const product2: INewProductOnly = {
                    name: body.name + (variedad.variedad !== "" ? (" - " + variedad.variedad) : ""),
                    short_descr: body.short_descr,
                    category: body.category,
                    subcategory: body.subcategory,
                    unidad: body.unidad,
                    cod_barra: variedad.cod_barra,
                    precio_compra: body.precio_compra,
                    global_name: body.global_name
                }

                const result = await store.update(Tables.PRODUCTS_PRINCIPAL, product2, body.id || 0);
                if (result.affectedRows > 0) {

                    if (listImgDelete) {
                        try {
                            listImgDelete.map(async img => {
                                const file: string = path.join(staticFolders.products, img || "");
                                fs.unlinkSync(file);
                                await store.remove(Tables.PRODUCTS_IMG, { url_img: img })
                            })
                        } catch (error) {
                            const file: string = path.join(staticFolders.products, String(listImgDelete) || "");
                            fs.unlinkSync(file);
                            await store.remove(Tables.PRODUCTS_IMG, { url_img: listImgDelete })
                        }
                    }

                    if (body.filesName) {
                        await store.remove(Tables.PRODUCTS_IMG, { url_img: "product.png" });
                        try {
                            body.filesName.map(async file => {
                                await store.insert(Tables.PRODUCTS_IMG, {
                                    id_prod: body.id,
                                    url_img: file.path
                                })
                                OptimizeImg(file.path);
                            });
                        } catch (error) {
                            await store.insert(Tables.PRODUCTS_IMG, {
                                id_prod: body.id,
                                url_img: body.filesName
                            })
                            OptimizeImg(String(body.filesName));
                        }
                    }

                    const imgagesProd = await store.query(Tables.PRODUCTS_IMG, { id_prod: body.id });
                    const cantImg = imgagesProd.length
                    if (cantImg === 0) {
                        await store.insert(Tables.PRODUCTS_IMG, {
                            id_prod: body.id,
                            url_img: "product.png"
                        })
                    }
                    if (key === product.variedades.length - 1) {
                        return result;
                    }
                }
            })
        } else {
            await upsertPrices(product.prices, false, body.precio_compra, body.global_name)
            product.variedades.map(async (variedad, key) => {
                const product2: INewProductOnly = {
                    name: body.name + (variedad.variedad !== "" ? (" - " + variedad.variedad) : ""),
                    short_descr: body.short_descr,
                    category: body.category,
                    subcategory: body.subcategory,
                    unidad: body.unidad,
                    cod_barra: variedad.cod_barra,
                    precio_compra: body.precio_compra,
                    global_name: body.global_name
                }

                const result = await store.insert(Tables.PRODUCTS_PRINCIPAL, product2);

                if (result.affectedRows > 0) {
                    if (body.filesName) {
                        try {
                            body.filesName.map(async file => {
                                await store.insert(Tables.PRODUCTS_IMG, {
                                    id_prod: result.insertId,
                                    url_img: file.path
                                })
                                OptimizeImg(file.path);
                            });
                        } catch (error) {
                            await store.insert(Tables.PRODUCTS_IMG, {
                                id_prod: result.insertId,
                                url_img: body.filesName
                            })
                        }
                    } else {
                        await store.insert(Tables.PRODUCTS_IMG, {
                            id_prod: result.insertId,
                            url_img: "product.png"
                        })
                    }
                    if (key === product.variedades.length - 1) {
                        return result;
                    }
                }
            })
        }
        return ""
    }

    const remove = async (id_prod: number) => {
        const data: Array<IImgProd> = await store.query(Tables.PRODUCTS_IMG, { id_prod: id_prod });
        if (data.length > 0) {
            data.map(url => {
                if (url.url_img !== "product.png") {
                    const file: string = path.join(staticFolders.products, url.url_img || "");
                    fs.unlinkSync(file);
                }
            })
        }
        await store.remove(Tables.PRODUCTS_IMG, { id_prod: id_prod });
        await store.remove(Tables.PRODUCTS_TAGS, { id_prod: id_prod });
        await store.remove(Tables.PRODUCTS_PRINCIPAL, { id: id_prod })
            .then(async (result: any) => {
                if (result.affectedRows > 0) {
                    await store.remove(Tables.PRODUCTS_PRINCIPAL, { id: id_prod })
                } else {
                    throw new Error();
                }
            })
    }

    const get = async (id: number, globalName: string) => {
        const productGral = await store.get(Tables.PRODUCTS_PRINCIPAL, id);
        const productImg = await store.query(Tables.PRODUCTS_IMG, { id_prod: id });
        const productTags = await store.query(Tables.PRODUCTS_TAGS, { id_prod: id });
        const productPrices = await store.query(Tables.PRODUCTS_PRICES, { global_name: globalName })
        return {
            productGral,
            productImg,
            productTags,
            productPrices
        }
    }

    const getPrincipal = async (id: number) => {
        const productGral = await store.get(Tables.PRODUCTS_PRINCIPAL, id);
        return {
            productGral
        }
    }

    const getCategory = async () => {
        const groupBy: Array<string> = [Columns.prodPrincipal.category];
        const groupBy2: Array<string> = [Columns.proveedores.fantasia];
        const prov = await store.list(Tables.PROVEEDORES, [Columns.proveedores.fantasia], undefined, groupBy2, undefined, undefined);
        let categories = await store.list(Tables.PRODUCTS_PRINCIPAL, [Columns.prodPrincipal.category], undefined, groupBy, undefined, undefined);
        if (categories.length > 0) {
            let lista: Array<any> = [];
            lista = categories;
            return new Promise((resolve, reject) => {
                if (prov.length > 0) {
                    prov.map((item: any, key: number) => {
                        const exist = lista.filter(item2 => item2.category === item.fantasia)
                        if (exist.length === 0) {
                            lista.push({
                                category: item.fantasia
                            })
                        }
                        if (key === (prov.length - 1)) {
                            resolve(lista)
                        }
                    })
                } else {
                    resolve(lista)
                }
            })
        } else {
            let lista: Array<any> = [];
            return new Promise((resolve, reject) => {
                prov.map((item: any, key: number) => {
                    lista.push({
                        category: item.fantasia
                    })
                    if (key === (prov.length - 1)) {
                        resolve(lista)
                    }
                })
            })
        }
    }

    const getSubCategory = async () => {
        const groupBy: Array<string> = [Columns.prodPrincipal.subcategory];
        return await store.list(Tables.PRODUCTS_PRINCIPAL, [Columns.prodPrincipal.subcategory], undefined, groupBy, undefined, undefined);
    }

    const varCost = async (aumento: boolean, porc: number, round: number, roundBool: boolean, item?: string) => {
        let filter: IWhereParams | undefined = undefined;
        let filters: Array<IWhereParams> = [];
        if (item) {
            filter = {
                mode: EModeWhere.like,
                concat: EConcatWhere.or,
                items: [
                    { column: Columns.prodPrincipal.name, object: String(item) },
                    { column: Columns.prodPrincipal.subcategory, object: String(item) },
                    { column: Columns.prodPrincipal.category, object: String(item) },
                    { column: Columns.prodPrincipal.short_decr, object: String(item) },
                    { column: Columns.prodPrincipal.cod_barra, object: String(item) }
                ]
            };
            filters.push(filter);
        }

        let aumentoFinal = porc;
        if (!aumento) {
            aumentoFinal = (- porc);
        }

        let roundNumber = 2
        if (!roundBool) {
            roundNumber = round
        }

        const updateCol: Array<IWhere> = [
            {
                column: Columns.productsPrices.buy_price,
                object: `(${Columns.productsPrices.buy_price} + ROUND((${Columns.productsPrices.buy_price} * ${aumentoFinal}), ${roundNumber}))`
            },
            {
                column: Columns.productsPrices.sell_price,
                object: `(${Columns.productsPrices.sell_price} + ROUND((${Columns.productsPrices.sell_price} * ${aumentoFinal}), ${roundNumber}))`
            },
        ];

        await store.updateWhere(Tables.PRODUCTS_PRICES, updateCol, filters);
    };

    const asignarCodBarra = async (id: number, codBarras: string) => {
        return await store.update(Tables.PRODUCTS_PRINCIPAL, { cod_barra: codBarras }, id)
    }

    const updateCost = async (idProd: number, cost: number) => {
        const data: Array<{ id: number }> = await store.getAnyCol(Tables.PRODUCTS_PRICES, { id_prod: idProd })
        return new Promise((resolve, reject) => {
            data.map(async (item, key) => {
                try {
                    await store.update(Tables.PRODUCTS_PRICES, { buy_price: cost }, item.id)
                } catch (error) {
                    reject(new Error("Inesperado"))
                }
                if (key === data.length - 1) {
                    resolve(await store.update(Tables.PRODUCTS_PRINCIPAL, { precio_compra: cost }, idProd))
                }
            })
        })
    }

    const getPrices = async (globalName: string) => {
        return await store.getAnyCol(Tables.PRODUCTS_PRICES, { global_name: globalName })
    }

    return {
        list,
        upsert,
        remove,
        get,
        getCategory,
        getSubCategory,
        varCost,
        getPrincipal,
        asignarCodBarra,
        updateCost,
        getPrices
    }
}
