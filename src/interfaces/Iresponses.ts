import { IImgProd } from 'interfaces/Itables';
import { IProdPrinc, IProdVar } from './Itables';
export interface INewPermissions {
    permisos: Array<INewPermission>,
    idUser: number
}

export interface INewPermission {
    idPermiso: number
}
export interface IProgGral extends IProdPrinc {
    id_var?: number,
    name_var: string,
    cod_barra: string,
    id_img?: number,
    url_img: string
}