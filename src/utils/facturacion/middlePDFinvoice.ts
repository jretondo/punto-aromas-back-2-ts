import { NextFunction, Request, Response } from 'express';
import { INewPV } from 'interfaces/Irequests';
import { IDetFactura, IFactura } from 'interfaces/Itables';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import utf8 from 'utf8';
import base64 from 'base-64';
import { Error } from 'tinify/lib/tinify/Error';
import ejs from 'ejs';
import { zfill } from '../cerosIzq';
import moment from 'moment';
import {
  CbteTipos,
  condFiscalIva,
  FactInscriptoProd,
  FactInscriptoServ,
  FactMonotribProd,
  FactMonotribServ,
} from './AfipClass';
import { formatMoney } from '../formatMoney';
import puppeteer from 'puppeteer';

export const invoicePDFMiddle = () => {
  const middleware = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const pvData: INewPV = req.body.pvData;
      const newFact: IFactura = req.body.newFact;
      const productsList: Array<IDetFactura> = req.body.productsList;
      const variosPagos = req.body.variosPagos;
      const dataFiscal = req.body.dataFiscal;

      const pvStr = zfill(newFact.pv, 5);
      const nroStr = zfill(newFact.cbte, 8);

      const base64_encode = (file: string): string => {
        const bitmap = fs.readFileSync(file);
        return Buffer.from(bitmap).toString('base64');
      };

      const logo64 = base64_encode(
        path.join('public', 'images', 'invoices', 'logo.png'),
      );

      let encabezado = {
        factNro: `${pvStr}-${nroStr}`,
        fechaFact: moment(newFact.fecha, 'YYYY-MM-DD').format('DD/MM/YYYY'),
        letra: newFact.letra,
        codFact: 'NO VÁLIDO COMO COMPROBANTE FISCAL',
      };

      let cbteAsoc = '';
      let footer = {
        logo: 'data:image/png;base64,' + logo64,
        logoAfip1: '',
        logoAfip2: '',
        codQR: '',
        caeNro: '',
        caeVto: '',
        vendedor: newFact.seller_name || '',
      };

      if (newFact.fiscal) {
        const factData = {
          ver: 1,
          fecha: newFact.fecha,
          cuit: pvData.cuit,
          ptoVta: pvData.pv,
          tipoCmp: newFact.t_fact,
          nroCmp: newFact.cbte,
          importe: newFact.total_fact,
          moneda: 'PES',
          ctz: 0,
          tipoDocRec: newFact.tipo_doc_cliente,
          nroDocRec: newFact.n_doc_cliente,
          tipoCodAut: 'E',
          codAut: newFact.cae,
        };

        const encoded = base64.encode(utf8.encode(JSON.stringify(factData)));
        const qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${encoded}`;

        const lAfip1 = base64_encode(
          path.join('public', 'images', 'invoices', 'AFIP1.png'),
        );
        const lAfip2 = base64_encode(
          path.join('public', 'images', 'invoices', 'AFIP2.png'),
        );
        const qrCode = await QRCode.toDataURL(qrUrl);

        encabezado = {
          factNro: `${pvStr}-${nroStr}`,
          fechaFact: moment(newFact.fecha, 'YYYY-MM-DD').format('DD/MM/YYYY'),
          letra: newFact.letra,
          codFact: zfill(dataFiscal.CbteTipo, 2),
        };

        if (
          [
            CbteTipos['Nota de Crédito A'],
            CbteTipos['Nota de Crédito B'],
            CbteTipos['Nota de Crédito C'],
            CbteTipos['Nota de Crédito M'],
          ].includes(dataFiscal.CbteTipo)
        ) {
          const cbteAsocObj = dataFiscal.CbtesAsoc?.CbtesAsoc?.[0] || {
            PtoVta: 0,
            Nro: 0,
          };
          cbteAsoc = `${zfill(cbteAsocObj.PtoVta, 5)} - ${zfill(
            cbteAsocObj.Nro,
            8,
          )}`;
        }

        footer = {
          logo: 'data:image/png;base64,' + logo64,
          logoAfip1: 'data:image/png;base64,' + lAfip1,
          logoAfip2: 'data:image/png;base64,' + lAfip2,
          codQR: qrCode,
          caeNro: dataFiscal.CAE || '',
          caeVto: moment(dataFiscal.CAEFchVto, 'YYYY-MM-DD').format(
            'DD/MM/YYYY',
          ),
          vendedor: newFact.seller_name || '',
        };
      }

      const myCss = fs.readFileSync(
        path.join('public', 'css', 'style.css'),
        'utf8',
      );

      const condIvaMap: Record<number, string> = {
        [condFiscalIva['IVA Responsable Inscripto']]:
          'IVA Responsable Inscripto',
        [condFiscalIva['IVA Sujeto Exento']]: 'IVA Sujeto Exento',
        [condFiscalIva['Responsable Monotributo']]: 'Responsable Monotributo',
        [condFiscalIva['Consumidor Final']]: 'Consumidor Final',
      };

      const condIvaStr = condIvaMap[pvData.cond_iva] || '';
      const condIvaStrCliente = condIvaMap[newFact.cond_iva_cliente] || '';

      const ptoVta = {
        razSocOrigen: pvData.raz_soc,
        direccionOrigen: pvData.direccion,
        condIvaOrigen: condIvaStr,
        emailOrigen: pvData.email,
        cuitOrigen: pvData.cuit,
        iibbOrigen: pvData.iibb,
        iniAct: moment(pvData.ini_act, 'YYYY-MM-DD').format('DD/MM/YYYY'),
      };

      const clientExtra = req.body.clientData || {};
      const cliente = {
        clienteEmail: newFact.email_cliente || '',
        clienteName: newFact.raz_soc_cliente || 'Consumidor Final',
        clienteNro: newFact.n_doc_cliente || '',
        tipoDoc: newFact.tipo_doc_cliente === 80 ? 'CUIT' : 'DNI',
        condIvaCliente: condIvaStrCliente,
        clienteDirection: clientExtra.direccion || '',
        clienteTelefono: clientExtra.telefono || '',
      };

      const totales = {
        subTotal: formatMoney(
          Math.abs(newFact.total_neto - newFact.costo_envio) +
            newFact.descuento,
        ),
        subTotalNoFiscal: formatMoney(
          Math.abs(
            newFact.total_neto - newFact.costo_envio + newFact.total_iva,
          ) + newFact.descuento,
        ),
        totalIva: formatMoney(Math.abs(newFact.total_iva)),
        totalFact: formatMoney(Math.abs(newFact.total_fact)),
        totalDesc: formatMoney(-newFact.descuento),
        totalEnvio: formatMoney(newFact.costo_envio),
      };

      let formapagoStr = '';
      switch (Number(newFact.forma_pago)) {
        case 0:
          formapagoStr = 'EFECTIVO';
          break;
        case 1:
          formapagoStr = 'MERCADO PAGO';
          break;
        case 2:
          formapagoStr = 'DEBITO';
          break;
        case 3:
          formapagoStr = 'CREDITO';
          break;
        case 4:
          formapagoStr = 'CUENTA CORRIENTE';
          break;
        case 6:
          formapagoStr = 'CHEQUE';
          break;
        case 7:
          formapagoStr = 'TRANSFERENCIA';
          break;
        default:
          formapagoStr = 'OTROS';
          break;
      }

      const formaPago = {
        string: formapagoStr,
        code: newFact.forma_pago,
      };

      const datos2 = {
        myCss: `<style>${myCss}</style>`,
        listaItems: productsList,
        cbteAsoc,
        formaPago,
        variosPagos,
        ...encabezado,
        ...ptoVta,
        ...cliente,
        ...totales,
        ...footer,
      };

      const ejsPath = path.join(
        'views',
        'invoices',
        newFact.fiscal ? 'Factura.ejs' : 'FacturaNoFiscal.ejs',
      );
      const html = await ejs.renderFile(ejsPath, datos2);

      const fileName = `${newFact.letra} ${pvStr}-${nroStr}.pdf`;
      const filePath = path.join('public', 'invoices', fileName);

      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath:
          process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      await page.pdf({
        path: filePath,
        format: 'A4',
        margin: { left: '0.5cm', right: '0.5cm' },
        printBackground: true,
      });

      await browser.close();

      req.body.fileName = fileName;
      req.body.filePath = filePath;
      req.body.formapagoStr = formapagoStr;

      next();
    } catch (error) {
      console.error('Error generando PDF de factura:', error);
      next(new Error('Faltan datos o hay datos erróneos, controlelo!'));
    }
  };

  return middleware;
};
