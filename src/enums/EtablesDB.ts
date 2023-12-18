enum AdminCol {
    id = 'id',
    nombre = 'nombre',
    apellido = 'apellido',
    email = 'email',
    usuario = 'usuario',
    pv = 'pv'
}

enum AuthAdmCol {
    id = 'id',
    usuario = 'usuario',
    pass = 'pass',
    prov = 'prov'
}

enum UserPermissionCol {
    id = "id",
    id_user = "id_user",
    id_permission = "id_permission"
}

enum PtosVta {
    id = "id",
    cuit = "cuit",
    raz_soc = "raz_soc",
    pv = "pv",
    carpeta_crt = "carpeta_crt",
    direccion = "direccion",
    nom_fantasia = "nom_fantasia",
    iibb = "iibb",
    cond_iva = "cond_iva",
    aviso_limite = "aviso_limite",
    logo_bool = "logo_bool",
    logo_img = "logo_img",
    ini_act = "ini_act",
    cat_mono = "cat_mono",
    stock_ind = "stock_ind"
}

enum ProductosPrincipal {
    id_prod = "id_prod",
    fecha_carga = "fecha_carga",
    name = "name",
    short_decr = "short_descr",
    enabled = "enabled",
    category = "category",
    subcategory = "subcategory",
    unidad = "unidad",
    costo = "costo",
    minorista = "minorista",
    mayorista_1 = "mayorista_1",
    mayorista_2 = "mayorista_2",
    mayorista_3 = "mayorista_3",
    revendedor = "revendedor",
    supermercado = "supermercado",
    cant_mayor1 = "cant_mayor1",
    cant_mayor2 = "cant_mayor2",
    cant_mayor3 = "cant_mayor3",
    cod_prod = "cod_prod"
}

enum ProductosVariedad {
    cod_barra = "cod_barra",
    id_prod = "id_prod",
    id_var = "id_var",
    name_var = "name_var"
}

enum ProductsImg {
    id_img = "id_img",
    id_prod = "id_prod",
    url_img = "url_img",
}

enum ProductsTag {
    id = "id",
    id_prod = "id_prod",
    tag = "tag"
}

enum Proveedores {
    id = "id",
    cuit = "cuit",
    ndoc = "ndoc",
    razsoc = "razsoc",
    telefono = "telefono",
    email = "email",
    cond_iva = "cond_iva",
    fantasia = "fantasia",
    obs = "obs",
    keyword = "keyword"
}

enum Clientes {
    id = "id",
    cuit = "cuit",
    ndoc = "ndoc",
    razsoc = "razsoc",
    telefono = "telefono",
    email = "email",
    cond_iva = "cond_iva",
    vendedor_id = "vendedor_id",
    price_default = "price_default",
    direccion = "direccion"
}

enum Permissions {
    id = "id",
    module_name = "module_name"
}

enum Stock {
    id = "id",
    fecha = "fecha",
    id_prod = "id_prod",
    pv_id = "pv_id",
    cant = "cant",
    venta = "venta",
    nro_remito = "nro_remito",
    costo = "costo",
    iva = "iva",
    id_user = "id_user",
    id_fact = "id_fact",
    prod_name = "prod_name",
    pv_descr = "pv_descr",
    category = "category",
    sub_category = "sub_category"
}

enum Facturas {
    id = "id",
    fecha = "fecha",
    pv = "pv",
    cbte = "cbte",
    letra = "letra",
    cae = "cae",
    vto_cae = "vto_cae",
    t_fact = "t_fact",
    cuit_origen = "cuit_origen",
    iibb_origen = "iibb_origen",
    ini_act_origen = "ini_act_origen",
    direccion_origen = "direccion_origen",
    raz_soc_origen = "raz_soc_origen",
    cond_iva_origen = "cond_iva_origen",
    tipo_doc_cliente = "tipo_doc_cliente",
    n_doc_cliente = "n_doc_cliente",
    cond_iva_cliente = "cond_iva_cliente",
    email_cliente = "email_cliente",
    nota_cred = "nota_cred",
    fiscal = "fiscal",
    raz_soc_cliente = "raz_soc_cliente",
    user_id = "user_id",
    seller_name = "seller_name",
    total_fact = "total_fact",
    total_iva = "total_iva",
    total_neto = "total_neto",
    total_compra = "total_compra",
    forma_pago = "forma_pago",
    pv_id = "pv_id",
    id_fact_asoc = "id_fact_asoc",
    create_time = "create_time",
    det_rbo = "det_rbo",
    costo_envio = "costo_envio",
    comision = "comision",
    comision_paga = "comision_paga",
    costo_imputar = "costo_imputar",
    monto_pago_cta_cte = "monto_pago_cta_cte",
    cancelada = "cancelada",
    monto_cta_cte = "monto_cta_cte",
    comision_imputar = "comision_imputar",
    comision_total = "comision_total",
    id_seller_comision = "id_seller_comision "
}

enum DetalleFact {
    id = "id",
    created_time = "created_time",
    fact_id = "fact_id",
    id_prod = "id_prod",
    nombre_prod = "nombre_prod",
    cant_prod = "cant_prod",
    unidad_tipo_prod = "unidad_tipo_prod",
    total_prod = "total_prod",
    total_iva = "total_iva",
    total_costo = "total_costo",
    total_neto = "total_neto",
    alicuota_id = "alicuota_id",
    precio_ind = "precio_ind",
    anulada = "anulada"
}

enum FormasPago {
    id = "id",
    id_fact = "id_fact",
    tipo = "tipo",
    importe = "importe"
}

enum HeroSlider {
    id = "id",
    tittle = "tittle",
    subtitle = "subtitle",
    image = "image",
    url = "url",
    active = "active"
}

export enum Tipos_Precios {
    costo = "costo",
    minorista = "minorista",
    mayorista_1 = "mayorista_1",
    mayorista_2 = "mayorista_2",
    mayorista_3 = "mayorista_3",
    revendedor = "revendedor",
    supermercado = "supermercado"
}

export enum MetodosPago {
    efectivo = 0,
    mercaPago = 1,
    debito = 2,
    credito = 3,
    ctaCte = 4,
    varios = 5,
    cheque = 6,
    transferencia = 7

}

export enum Tables {
    ADMIN = "administradores",
    AUTH_ADMIN = "auth_admin",
    USER_PERMISSIONS = "admin_permissions",
    PUNTOS_VENTA = "puntos_venta",
    PRODUCTS_PRINCIPAL = "products_principal",
    PRODUCTS_IMG = "products_img",
    PRODUCTS_TAGS = "produscts_tags",
    PRODUCTS_VAR = "prod_variedades",
    PROVEEDORES = "proveedores",
    CLIENTES = "clientes",
    PERMISSIONS = "permissions",
    STOCK = "stock",
    FACTURAS = "facturas",
    DET_FACTURAS = "detalle_fact",
    FORMAS_PAGO = "formas_pago",
    HERO_SLIDER = "hero_slider",
}

export const Columns = {
    admin: AdminCol,
    authAdmin: AuthAdmCol,
    userPemissions: UserPermissionCol,
    ptosVta: PtosVta,
    prodPrincipal: ProductosPrincipal,
    prodImg: ProductsImg,
    prodTags: ProductsTag,
    prodVar: ProductosVariedad,
    proveedores: Proveedores,
    clientes: Clientes,
    permissions: Permissions,
    stock: Stock,
    facturas: Facturas,
    detallesFact: DetalleFact,
    formasPago: FormasPago,
    heroSlider: HeroSlider
}