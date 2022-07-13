import { MetodosPago } from './../enums/EtablesDB';
import { IObjectFiles } from "./Ifunctions";

export interface INewUser {
    id?: number,
    nombre: string,
    apellido: string
    email: string,
    usuario: string,
    pv: number
}
export interface INewPermissions {
    permisos: Array<INewPermission>,
    idUser: number
}

export interface INewPermission {
    idPermiso: number
}

export interface INewPV {
    id?: number,
    cuit: number,
    raz_soc: string,
    ini_act: Date,
    pv: number,
    direccion: string,
    iibb: string,
    cond_iva: number,
    cat_mono: number,
    stock_ind: boolean,
    filesName?: Array<IObjectFiles>,
    key_file?: string,
    cert_file?: string,
    fact_m?: boolean,
    email: string
}
export interface INewProduct {
    id_prod?: number,
    name: string,
    short_descr: string,
    category: string,
    subcategory: string,
    unidad: number,
    iva: number,
    costo: number,
    minorista: number,
    mayorista_1: number,
    mayorista_2: number,
    mayorista_3: number,
    revendedor: number,
    supermercado: number,
    variedades: Array<INewVariedad>,
    filesName?: Array<IObjectFiles>
}
export interface INewVariedad {
    variedad: string,
    cod_barra: string
}
export interface INewStock {
    arrayBool: boolean,
    nvoStockSingle: number,
    pv_id: number,
    pv: number,
    idProd: number,
    obs: string,
    costo: number,
    iva: number,
    id_user: number,
    precio_compra: number,
    porc_minor: number,
    round: number,
    vta_price: number,
    vta_fija: boolean,
    prod_name: string,
    pv_descr: string,
    category: string,
    sub_category: string,
    fact_id?: number
}
export interface INewFactura {
    fecha: Date,
    pv_id: number,
    t_fact: CbteTipos,
    fiscal: boolean,
    cond_iva: number,
    forma_pago: number,
    enviar_email: boolean,
    descuentoPerc: number,
    costoEnvio: number,
    lista_prod: Array<{
        id_prod: number,
        cant_prod: number,
        price: number
    }>,
    cliente_bool: boolean,
    cliente_tdoc?: number,
    cliente_ndoc?: number,
    cliente_email?: string,
    cliente_name?: string,
    det_rbo?: string,
    variosPagos?: Array<{
        tipo: MetodosPago,
        tipo_txt: string,
        importe: number
    }>
}

export interface ImodifyFactPay {
    costo_imputar: number,
    monto_pago_cta_cte: number,
    cancelada: boolean,
    comision_imputar: number
}

export interface ImodifyCtaCte {
    costo_imputar: number,
    monto_cta_cte: number,
    comision_imputar: number,
    comision_total: number,
    total_compra: number,
    comision: number,
    monto_pago_cta_cte?: number
}