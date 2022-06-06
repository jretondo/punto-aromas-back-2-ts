import path from 'path';
import ejs from 'ejs';
import sendEmail from './sendmail';
import Colors from '../data/Colors.json';
import Links from '../data/Links.json';
import Names from '../data/Names.json';
import { IUser, IClientes } from 'interfaces/Itables';

export const sendAvisoClienteSeller = async (
    sellerData: IUser,
    clientData: IClientes,
    asign: boolean
): Promise<any> => {
    let tdoc = "DNI"

    if (clientData.cuit) {
        tdoc = "CUIT"
    } else {
        tdoc = "DNI"
    }

    let asunto = "Nuevo cliente asignado a usted!"
    if (!asign) {
        asunto = "Un cliente menos!"
    }

    let informationList: Array<any> = []
    let parrafosHead: Array<any> = []

    let datos2 = {
        Colors,
        Links,
        Names,
        //Particular
        //Head
        titlePage: "Aviso de clientes",
        titleHead: "Hola " + sellerData.nombre + " " + sellerData.apellido || "",
        parrafosHead: parrafosHead,

        //InfoForm
        titleInfoForm: "Los datos del cliente",
        informationList: informationList
    }


    if (asign) {
        asunto = "Nuevo cliente asignado a usted!"
        informationList = [
            {
                col1: 6,
                title1: "Razón Social",
                content1: clientData.razsoc || "",
                col2: 6,
                title2: tdoc,
                content2: clientData.ndoc || ""
            }
        ]
        parrafosHead = [
            "Nos alegra informarte que te acaban de asignar un cliente nuevo en el sistema!"
        ]

        datos2 = {
            Colors,
            Links,
            Names,
            //Particular
            //Head
            titlePage: "Aviso de clientes",
            titleHead: "Hola " + sellerData.nombre + " " + sellerData.apellido || "",
            parrafosHead: parrafosHead,

            //InfoForm
            titleInfoForm: "Los datos del cliente",
            informationList: informationList
        }

    } else {
        asunto = "Un cliente menos!"
        informationList = [
            {
                col1: 6,
                title1: "Razón Social",
                content1: clientData.razsoc || "",
                col2: 6,
                title2: tdoc,
                content2: clientData.ndoc || ""
            }
        ]


        parrafosHead = [
            "Lamentamos informarte que se te acaba de quitar un cliente en tu cartera de comisiones."
        ]

        datos2 = {
            Colors,
            Links,
            Names,
            //Particular
            //Head
            titlePage: "Aviso de clientes",
            titleHead: "Hola " + sellerData.nombre + " " + sellerData.apellido || "",
            parrafosHead: parrafosHead,

            //InfoForm
            titleInfoForm: "Los datos del cliente",
            informationList: informationList
        }
    }

    return new Promise((resolve, reject) => {
        ejs.renderFile(path.join("views", "emails", "Templates", "FactEmail.ejs"), datos2, async (err, data) => {
            if (err) {
                console.error(err);
                resolve(false);
            } else {
                try {
                    resolve(await sendEmail(sellerData.email, asunto, data))
                } catch (error) {
                    console.error(error);
                    reject(error);
                }
            }
        })
    });
}