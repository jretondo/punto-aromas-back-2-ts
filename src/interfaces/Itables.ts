import { file } from './../network/response';
import { Multer } from 'multer';
import { MetodosPago } from './../enums/EtablesDB';
export interface Iauth {
    id?: number,
    usuario: string,
    pass?: string,
    prov: number
}
export interface IUser {
    id?: number,
    nombre: string,
    apellido: string
    email: string,
    usuario: string,
    pv: number,
    admin: number
}
export interface IUserPermission {
    id?: number,
    id_user: number,
    id_permission: number
}
export interface IProveedor {
    id?: number,
    cuit: boolean,
    ndoc: string,
    razsoc: string,
    telefono: string,
    email: string,
    cond_iva: number,
    fantasia: string,
    obs: string,
    keyword: string
}
export interface IClientes {
    id?: number,
    cuit: boolean,
    ndoc: string,
    razsoc: string,
    telefono: string,
    email: string,
    cond_iva: number,
    direccion: string,
    vendedor_id?: number,
    price_default?: string
}
export interface IMovStock {
    id?: number,
    fecha: Date,
    id_prod: number,
    pv: number,
    cant: number,
    venta: boolean,
    nro_remito: string,
    costo: number,
    iva: number,
    prod_name: string,
    pv_descr: string,
    category: string,
    sub_category: string,
    pv_id: number,
    id_user?: number
}
export interface IModPriceProd {
    id: number,
    precio_compra: number,
    porc_minor: number,
    round: number,
    vta_price: number,
    vta_fija: boolean
}
export interface IFactura {
    id?: number,
    create_time?: Date,
    fecha: Date,
    pv: number,
    cbte: number,
    letra: string,
    cae?: string,
    vto_cae?: Date,
    t_fact: number,
    cuit_origen: number,
    iibb_origen: string,
    ini_act_origen: Date,
    direccion_origen: string,
    raz_soc_origen: string,
    cond_iva_origen: number,
    tipo_doc_cliente: number,
    n_doc_cliente: number,
    cond_iva_cliente: number,
    email_cliente: string,
    nota_cred: boolean,
    fiscal: boolean,
    raz_soc_cliente: string,
    user_id: number,
    seller_name: string,
    total_fact: number,
    total_iva: number,
    total_neto: number,
    total_compra: number,
    forma_pago: MetodosPago,
    pv_id: number,
    id_fact_asoc: number,
    descuento: number,
    costo_envio: number,
    det_rbo?: string,
    comision: number,
    comision_paga: number,
    costo_imputar: number,
    monto_pago_cta_cte: number,
    cancelada: boolean,
    monto_cta_cte: number,
    comision_imputar: number,
    comision_total: number,
    id_seller_comision: number,
    costo_total: number,
    SUMA?: number
}

export interface IDetFactura {
    id?: number,
    create_time?: Date
    fact_id?: number,
    id_prod: number,
    nombre_prod: string,
    cant_prod: number,
    unidad_tipo_prod: number,
    total_prod: number,
    total_iva: number,
    total_costo: number,
    total_neto: number,
    alicuota_id: number,
    precio_ind: number,
    anulada?: boolean
}
export interface IFormasPago {
    id?: number,
    id_fact: number,
    tipo: MetodosPago,
    importe: number,
    tipo_txt: string
}

export interface IImgProd {
    id_img?: number,
    id_prod: number,
    url_img: string
}

export interface IProdPrinc {
    id_prod?: number,
    fecha_carga?: Date,
    name: string,
    short_descr: string,
    enabled: boolean,
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
    cant_mayor1: number,
    cant_mayor2: number,
    cant_mayor3: number,
    cod_prod: string
}

export interface IProdVar {
    id_var?: number,
    name_var: string,
    cod_barra: string,
    id_prod: number
}

export interface IPrices {
    type_price_name: string,
    sell_price: number,
    min: number
}

export interface CtaCte {
    id: number,
    fecha: Date,
    id_cliente: number,
    id_factura: number,
    id_recibo: number,
    forma_pago: number
    importe: number,
    detalle: string,
    comision: number
}
export interface CtaCteVende {
    id: number,
    fecha: Date,
    id_cliente: number,
    id_factura: number,
    id_recibo: number,
    forma_pago: number
    importe: number,
    detalle: string,
    comision: number
}

export interface IHeroSlider {
    id?: number,
    title: string,
    subtitle: string,
    image: string,
    url: string,
    active: boolean,
    type: boolean,
    filesName?: Express.Multer.File[]
}