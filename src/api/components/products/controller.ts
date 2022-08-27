import { createProdListPDF } from './../../../utils/facturacion/lists/createListProducts';
import { INewInsert, IWhere } from './../../../interfaces/Ifunctions';
import { IProdVar, IProdPrinc, IImgProd, IPrices } from './../../../interfaces/Itables';
import { INewVariedad } from './../../../interfaces/Irequests';
import { EConcatWhere, EModeWhere, ESelectFunct, ETypesJoin } from '../../../enums/EfunctMysql';
import { Tables, Columns } from '../../../enums/EtablesDB';
import StoreType from '../../../store/mysql';
import getPages from '../../../utils/getPages';
import OptimizeImg from '../../../utils/optimeImg';
import { IJoin, Ipages, IWhereParams, Iorder } from 'interfaces/Ifunctions';
import { INewProduct } from 'interfaces/Irequests';

export = (injectedStore: typeof StoreType) => {
    let store = injectedStore;

    const list = async (page?: number, item?: string, cantPerPage?: number) => {
        let filter: IWhereParams | undefined = undefined;
        let filters: Array<IWhereParams> = [];
        let conID = false
        let idProd = 0
        if (item) {
            if (item.includes("id:")) {
                conID = true
                idProd = Number(item.replace("id:", ""))
            } else {
                const arrayStr = item.split(" ")
                arrayStr.map(subItem => {
                    filter = {
                        mode: EModeWhere.like,
                        concat: EConcatWhere.or,
                        items: [
                            { column: Columns.prodPrincipal.name, object: String(subItem) },
                            { column: Columns.prodPrincipal.subcategory, object: String(subItem) },
                            { column: Columns.prodPrincipal.category, object: String(subItem) },
                            { column: Columns.prodPrincipal.short_decr, object: String(subItem) }
                        ]
                    };
                    filters.push(filter);
                })
            }
        }
        if (conID) {
            let data = await store.get(Tables.PRODUCTS_PRINCIPAL, idProd, Columns.prodPrincipal.id_prod)

            return {
                data
            }
        } else {
            const groupBy: Array<string> = [`${Tables.PRODUCTS_PRINCIPAL}.${Columns.prodPrincipal.id_prod}`];

            const joinQuery1: IJoin = {
                table: Tables.PRODUCTS_IMG,
                colJoin: Columns.prodImg.id_prod,
                colOrigin: Columns.prodPrincipal.id_prod,
                type: ETypesJoin.left
            };

            let pages: Ipages;
            if (page) {
                pages = {
                    currentPage: page,
                    cantPerPage: cantPerPage || 10,
                    order: `${Tables.PRODUCTS_PRINCIPAL}.${Columns.prodPrincipal.id_prod}`,
                    asc: true
                };
                const data = await store.list(Tables.PRODUCTS_PRINCIPAL, ["*"], filters, groupBy, pages, [joinQuery1]);

                const cant = await store.list(Tables.PRODUCTS_PRINCIPAL, [`COUNT(${ESelectFunct.all}) AS COUNT`], filters);

                const pagesObj = await getPages(cant[0].COUNT, 10, Number(page));

                return {
                    data,
                    pagesObj
                };
            } else {
                const data = await store.list(Tables.PRODUCTS_PRINCIPAL, [ESelectFunct.all], filters, undefined, undefined, [joinQuery1]);
                return {
                    data
                };
            }
        }
    }

    const prodListPDF = async (item?: string): Promise<any> => {
        let filter: IWhereParams | undefined = undefined;
        let filters: Array<IWhereParams> = [];

        if (item) {
            const arrayStr = item.split(" ")
            arrayStr.map(subItem => {
                filter = {
                    mode: EModeWhere.like,
                    concat: EConcatWhere.or,
                    items: [
                        { column: Columns.prodPrincipal.name, object: String(subItem) },
                        { column: Columns.prodPrincipal.subcategory, object: String(subItem) },
                        { column: Columns.prodPrincipal.category, object: String(subItem) },
                        { column: Columns.prodPrincipal.short_decr, object: String(subItem) }
                    ]
                };
                filters.push(filter);
            })
        }

        //const groupBy: Array<string> = [`${Tables.PRODUCTS_PRINCIPAL}.${Columns.prodPrincipal.id_prod}`];

        const joinQuery1: IJoin = {
            table: Tables.PRODUCTS_VAR,
            colJoin: Columns.prodVar.id_prod,
            colOrigin: Columns.prodPrincipal.id_prod,
            type: ETypesJoin.right
        };

        const order: Iorder = {
            columns: [Columns.prodPrincipal.name, Columns.prodPrincipal.subcategory, Columns.prodVar.name_var],
            asc: true
        }

        const data = await store.list(Tables.PRODUCTS_PRINCIPAL, [ESelectFunct.all], filters, undefined, undefined, [joinQuery1], order);

        const prodList = await createProdListPDF(data)
        return prodList
    }

    const upsertVariedades = async (variedades: Array<INewVariedad>, update: boolean, id_prod: number) => {

        if (variedades.length > 0) {
            if (update) {
                await store.remove(Tables.PRODUCTS_VAR, { id_prod: id_prod })
                variedades.map(async (variedad) => {
                    const newPrice: IProdVar = {
                        id_prod: id_prod,
                        cod_barra: variedad.cod_barra,
                        name_var: variedad.variedad
                    }
                    await store.insert(Tables.PRODUCTS_VAR, newPrice)
                })
            } else {
                variedades.map(async (variedad) => {
                    const newPrice: IProdVar = {
                        id_prod: id_prod,
                        cod_barra: variedad.cod_barra,
                        name_var: variedad.variedad
                    }
                    await store.insert(Tables.PRODUCTS_VAR, newPrice)
                })
            }
        }
    }

    const upsert = async (body: INewProduct, listImgDelete?: Array<string>) => {

        if (body.id_prod) {
            const product: IProdPrinc = {
                name: body.name,
                short_descr: body.short_descr,
                category: body.category,
                subcategory: body.subcategory,
                unidad: body.unidad,
                costo: body.costo,
                minorista: body.minorista,
                mayorista_1: body.mayorista_1,
                mayorista_2: body.mayorista_2,
                mayorista_3: body.mayorista_3,
                revendedor: body.revendedor,
                supermercado: body.supermercado,
                cant_mayor1: body.cant_mayor1,
                cant_mayor2: body.cant_mayor2,
                cant_mayor3: body.cant_mayor3,
                cod_prod: body.cod_prod,
                enabled: true,
                iva: body.iva
            }
            await upsertVariedades(JSON.parse(String(body.variedades)), true, body.id_prod)
            const result = await store.update(Tables.PRODUCTS_PRINCIPAL, product, body.id_prod || 0, "id_prod");
            if (result.affectedRows > 0) {
                if (listImgDelete) {
                    try {
                        listImgDelete.map(async img => {
                            await store.remove2(Tables.PRODUCTS_IMG, `url_img= '${img}' AND id_prod= '${body.id_prod}'`)
                        })
                    } catch (error) {
                        await store.remove2(Tables.PRODUCTS_IMG, `url_img= '${listImgDelete}' AND id_prod= ${body.id_prod}`)
                    }
                }

                if (body.filesName) {
                    await store.remove2(Tables.PRODUCTS_IMG, `url_img= '${listImgDelete}' AND id_prod= ${body.id_prod}`)
                    try {
                        body.filesName.map(async file => {
                            await store.insert(Tables.PRODUCTS_IMG, {
                                id_prod: body.id_prod,
                                url_img: file.path
                            })
                            OptimizeImg(file.path);
                        });
                    } catch (error) {
                        await store.insert(Tables.PRODUCTS_IMG, {
                            id_prod: body.id_prod,
                            url_img: body.filesName,
                        })
                        OptimizeImg(String(body.filesName));
                    }
                }

                const imgagesProd = await store.query(Tables.PRODUCTS_IMG, { id_prod: body.id_prod });
                const cantImg = imgagesProd.length
                if (cantImg === 0) {
                    await store.insert(Tables.PRODUCTS_IMG, {
                        id_prod: body.id_prod,
                        url_img: "product.png"
                    })
                }
            }
        } else {
            const product: IProdPrinc = {
                name: body.name,
                short_descr: body.short_descr,
                category: body.category,
                subcategory: body.subcategory,
                unidad: body.unidad,
                costo: body.costo,
                minorista: body.minorista,
                mayorista_1: body.mayorista_1,
                mayorista_2: body.mayorista_2,
                mayorista_3: body.mayorista_3,
                revendedor: body.revendedor,
                supermercado: body.supermercado,
                cant_mayor1: body.cant_mayor1,
                cant_mayor2: body.cant_mayor2,
                cant_mayor3: body.cant_mayor3,
                cod_prod: body.cod_prod,
                enabled: true,
                iva: body.iva
            }

            const result: INewInsert = await store.insert(Tables.PRODUCTS_PRINCIPAL, product);
            await upsertVariedades(JSON.parse(String(body.variedades)), true, result.insertId)
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
            }

        }
        return ""
    }

    const remove = async (id_prod: number) => {
        await store.remove(Tables.PRODUCTS_PRINCIPAL, { id_prod: id_prod })
            .then(async (result: any) => {
                if (result.affectedRows > 0) {
                    await store.remove(Tables.PRODUCTS_IMG, { id_prod: id_prod })
                    await store.remove(Tables.PRODUCTS_VAR, { id_prod: id_prod })
                } else {
                    throw new Error();
                }
            })
    }

    const get = async (id: number) => {
        const productGral = await store.query(Tables.PRODUCTS_PRINCIPAL, { id_prod: id });
        const productImg = await store.query(Tables.PRODUCTS_IMG, { id_prod: id });
        const productTags = await store.query(Tables.PRODUCTS_TAGS, { id_prod: id });
        const productPrices = await store.query(Tables.PRODUCTS_VAR, { id_prod: id })
        const productsVar = await store.query(Tables.PRODUCTS_VAR, { id_prod: id });
        return {
            productGral,
            productImg,
            productTags,
            productPrices,
            productsVar
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

    const asignarCodBarra = async (id: number, codBarras: string) => {
        return await store.update(Tables.PRODUCTS_PRINCIPAL, { cod_barra: codBarras }, id)
    }

    const varCost = async (aumento: boolean, porc: number, round: number, roundBool: boolean, item?: string) => {
        let aumentoFinal = porc;
        if (!aumento) {
            aumentoFinal = (- porc);
        }

        let roundNumber = 2
        if (roundBool) {
            roundNumber = round
        }

        const updateCol: Array<IWhere> = [
            {
                column: Columns.prodPrincipal.costo,
                object: String(`ROUND((${Columns.prodPrincipal.costo} + (${Columns.prodPrincipal.costo})* ${aumentoFinal}), ${roundNumber})`)
            },
            {
                column: Columns.prodPrincipal.minorista,
                object: String(`ROUND((${Columns.prodPrincipal.minorista} + (${Columns.prodPrincipal.minorista})* ${aumentoFinal}), ${roundNumber})`)
            },
            {
                column: Columns.prodPrincipal.mayorista_1,
                object: String(`ROUND((${Columns.prodPrincipal.mayorista_1} + (${Columns.prodPrincipal.mayorista_1})* ${aumentoFinal}), ${roundNumber})`)
            },
            {
                column: Columns.prodPrincipal.mayorista_2,
                object: String(`ROUND((${Columns.prodPrincipal.mayorista_2} + (${Columns.prodPrincipal.mayorista_2})* ${aumentoFinal}), ${roundNumber})`)
            },
            {
                column: Columns.prodPrincipal.mayorista_3,
                object: String(`ROUND((${Columns.prodPrincipal.mayorista_3} + (${Columns.prodPrincipal.mayorista_3})* ${aumentoFinal}), ${roundNumber})`)
            },
            {
                column: Columns.prodPrincipal.revendedor,
                object: String(`ROUND((${Columns.prodPrincipal.revendedor} + (${Columns.prodPrincipal.revendedor})* ${aumentoFinal}), ${roundNumber})`)
            },
            {
                column: Columns.prodPrincipal.supermercado,
                object: String(`ROUND((${Columns.prodPrincipal.supermercado} + (${Columns.prodPrincipal.supermercado})* ${aumentoFinal}), ${roundNumber})`)
            }
        ];
        let filter: IWhereParams | undefined = undefined;
        let filters: Array<IWhereParams> = [];

        if (item) {
            const arrayStr = item.split(" ")
            arrayStr.map(subItem => {
                filter = {
                    mode: EModeWhere.like,
                    concat: EConcatWhere.or,
                    items: [
                        { column: Columns.prodPrincipal.name, object: String(subItem) },
                        { column: Columns.prodPrincipal.subcategory, object: String(subItem) },
                        { column: Columns.prodPrincipal.category, object: String(subItem) },
                        { column: Columns.prodPrincipal.short_decr, object: String(subItem) }
                    ]
                };
                filters.push(filter);
            })
        }
        return await store.updateWhere(Tables.PRODUCTS_PRINCIPAL, updateCol, filters)

    };

    const updateCost = async (idProd: number, cost: number, oldCost: number) => {
        const percentage = ((cost - oldCost) / oldCost)
        const updateCol: Array<IWhere> = [
            {
                column: Columns.prodPrincipal.costo,
                object: String(cost)
            },
            {
                column: Columns.prodPrincipal.minorista,
                object: String(`ROUND((${Columns.prodPrincipal.minorista} + (${Columns.prodPrincipal.minorista})* ${percentage}), 2)`)
            },
            {
                column: Columns.prodPrincipal.mayorista_1,
                object: String(`ROUND((${Columns.prodPrincipal.mayorista_1} + (${Columns.prodPrincipal.mayorista_1})* ${percentage}), 2)`)
            },
            {
                column: Columns.prodPrincipal.mayorista_2,
                object: String(`ROUND((${Columns.prodPrincipal.mayorista_2} + (${Columns.prodPrincipal.mayorista_2})* ${percentage}), 2)`)
            },
            {
                column: Columns.prodPrincipal.mayorista_3,
                object: String(`ROUND((${Columns.prodPrincipal.mayorista_3} + (${Columns.prodPrincipal.mayorista_3})* ${percentage}), 2)`)
            },
            {
                column: Columns.prodPrincipal.revendedor,
                object: String(`ROUND((${Columns.prodPrincipal.revendedor} + (${Columns.prodPrincipal.revendedor})* ${percentage}), 2)`)
            },
            {
                column: Columns.prodPrincipal.supermercado,
                object: String(`ROUND((${Columns.prodPrincipal.supermercado} + (${Columns.prodPrincipal.supermercado})* ${percentage}), 2)`)
            }
        ];

        const filters: Array<IWhereParams> = [{
            mode: EModeWhere.strict,
            concat: EConcatWhere.none,
            items: [
                { column: Columns.prodPrincipal.id_prod, object: String(idProd) }
            ]
        }]

        return await store.updateWhere(Tables.PRODUCTS_PRINCIPAL, updateCol, filters)
    }

    const publicList = async () => {
        const groupBy: Array<string> = [Columns.prodPrincipal.id_prod, Columns.prodPrincipal.subcategory];
        const lista: Array<INewProduct> = await store.list(Tables.PRODUCTS_PRINCIPAL, ["*"], undefined, groupBy)
        return new Promise((resolve, reject) => {
            let products: Array<any> = []
            lista.map(async (item, key) => {
                const sku = item.name
                const name = item.name
                let filter2: IWhereParams | undefined = undefined;
                let filters2: Array<IWhereParams> = [];

                filter2 = {
                    mode: EModeWhere.strict,
                    concat: EConcatWhere.none,
                    items: [
                        { column: Columns.prodImg.id_prod, object: String(item.id_prod) }
                    ]
                };

                filters2.push(filter2);

                const cat = item.category
                const subCat = item.subcategory
                const category = [subCat]
                const saleCount = 100
                const nuevo = false
                const discount = 0
                const variation: any = await new Promise(async (resolve, reject) => {
                    const varList: Array<IProdVar> = await store.get(Tables.PRODUCTS_VAR, item.id_prod || 0, "id_prod")

                    let listadoVar: any = []
                    if (varList.length > 0) {
                        varList.map(async (item, key2) => {
                            listadoVar.push(
                                {
                                    name: item.name_var,
                                    stock: 50
                                }
                            )
                            if (key2 === varList.length - 1) {
                                resolve(listadoVar)
                            }
                        })
                    } else {
                        listadoVar = [{
                            name: "",
                            stock: 50
                        }]
                        resolve(listadoVar)
                    }
                })
                const prices: Array<IPrices> = [
                    {
                        type_price_name: "MINORISTA",
                        sell_price: item.minorista,
                        min: 0
                    },
                    {
                        type_price_name: "MAYORISTA 1",
                        sell_price: item.mayorista_1,
                        min: item.cant_mayor1
                    },
                    {
                        type_price_name: "MAYORISTA 2",
                        sell_price: item.mayorista_2,
                        min: item.cant_mayor2
                    },
                    {
                        type_price_name: "MAYORISTA 3",
                        sell_price: item.mayorista_3,
                        min: item.cant_mayor3
                    },
                    {
                        type_price_name: "SUPERMERCADO",
                        sell_price: item.supermercado,
                        min: 0
                    },
                    {
                        type_price_name: "REVENDEDOR",
                        sell_price: item.revendedor,
                        min: 0
                    }
                ]
                const groupBy2: Array<string> = [Columns.prodImg.url_img];
                const shortDescription = item.short_descr
                const image = await store.list(Tables.PRODUCTS_IMG, ["*"], filters2, groupBy2)
                products.push({
                    id: key,
                    sku,
                    name,
                    category,
                    saleCount,
                    nuevo,
                    discount,
                    variation,
                    shortDescription,
                    image,
                    prices
                })
                if (key === lista.length - 1) {
                    resolve({
                        products
                    })
                }
            })
        })
    }

    const getImagesProduct = async (prodId: number) => {
        let filter: IWhereParams | undefined = undefined;
        let filters: Array<IWhereParams> = [];

        filter = {
            mode: EModeWhere.strict,
            concat: EConcatWhere.none,
            items: [
                { column: Columns.prodImg.id_prod, object: String(prodId) }
            ]
        };

        filters.push(filter);
        return await store.list(Tables.PRODUCTS_IMG, ["*"], filters)
    }

    const newImg = async (body: INewProduct, listImgDelete?: Array<string>) => {
        if (listImgDelete) {
            try {
                listImgDelete.map(async img => {
                    await store.remove2(Tables.PRODUCTS_IMG, `url_img= '${img}' AND id_prod= '${body.id_prod}'`)
                })
            } catch (error) {
                await store.remove2(Tables.PRODUCTS_IMG, `url_img= '${listImgDelete}' AND id_prod= ${body.id_prod}`)
            }
        }

        if (body.filesName) {
            await store.remove2(Tables.PRODUCTS_IMG, `url_img= '${listImgDelete}' AND id_prod= ${body.id_prod}`)
            try {
                body.filesName.map(async file => {
                    await store.insert(Tables.PRODUCTS_IMG, {
                        id_prod: body.id_prod,
                        url_img: file.path,
                    })
                    OptimizeImg(file.path);
                });
            } catch (error) {
                await store.insert(Tables.PRODUCTS_IMG, {
                    id_prod: body.id_prod,
                    url_img: body.filesName,
                })
                OptimizeImg(String(body.filesName));
            }
        }

        const imgagesProd = await store.query(Tables.PRODUCTS_IMG, { id_prod: body.id_prod });
        const cantImg = imgagesProd.length
        if (cantImg === 0) {
            await store.insert(Tables.PRODUCTS_IMG, {
                id_prod: body.id_prod,
                url_img: "product.png"
            })
        }
    }

    const correctImages = async () => {
        const dataProduct: Array<IProdPrinc> = await store.list(Tables.PRODUCTS_PRINCIPAL, ["*"])

        //console.log('dataProduct :>> ', dataProduct);
        dataProduct.map(async (item, key) => {
            const idProd = item.id_prod
            const imageList: Array<IImgProd> = await store.query(Tables.PRODUCTS_IMG, { id_prod: idProd })
            if (imageList.length === 0) {
                const image: IImgProd = {
                    id_prod: idProd || 0,
                    url_img: "product.png"
                }
                await store.insert(Tables.PRODUCTS_IMG, image)
            }
            if (key === imageList.length - 1) {
                return dataProduct
            }
        })
    }

    const correctName = async () => {
        const dataProduct: Array<IProdPrinc> = await store.list(Tables.PRODUCTS_PRINCIPAL, ["*"])
        return new Promise((resolve, reject) => {
            dataProduct.map(async (item, key) => {
                const name = item.name
                const marca = `(${item.subcategory})`
                const newName = name.replace(" " + marca, "")
                await store.update(Tables.PRODUCTS_PRINCIPAL, { name: newName }, item.id_prod || 0, Columns.prodPrincipal.id_prod)
                if (key === dataProduct.length - 1) {
                    resolve(dataProduct)
                }
            })
        })
    }

    const correctVariedades = async () => {
        const dataProduct: Array<IProdPrinc> = await store.list(Tables.PRODUCTS_PRINCIPAL, ["*"])
        return new Promise((resolve, reject) => {
            dataProduct.map(async (item, key) => {
                const variedades: Array<IProdVar> = await store.query(Tables.PRODUCTS_VAR, { id_prod: item.id_prod })
                if (variedades.length > 0) {
                    new Promise((resolve, reject) => {
                        variedades.map(async (itemVar, key) => {
                            const nameVar = itemVar.name_var
                            const prodName = item.name + " - "
                            const newName = nameVar.replace(prodName, "")
                            await store.update(Tables.PRODUCTS_VAR, { name_var: newName }, itemVar.id_var || 0, Columns.prodVar.id_var)
                            if (key === variedades.length - 1) {
                                resolve("")
                            }
                        })
                    })
                }
                if (key === dataProduct.length - 1) {
                    resolve(dataProduct)
                }
            })
        })
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
        publicList,
        getImagesProduct,
        newImg,
        correctImages,
        correctName,
        correctVariedades,
        prodListPDF
    }
}
