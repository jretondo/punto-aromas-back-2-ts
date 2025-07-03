import { NextFunction, Request, Response } from 'express';
import { INewPV } from 'interfaces/Irequests';
import { IFactura } from 'interfaces/Itables';
import fs from 'fs';
import path from 'path';
import { Error } from 'tinify/lib/tinify/Error';
import ejs from 'ejs';
import { zfill } from '../cerosIzq';
import moment from 'moment';
import { condFiscalIva } from './AfipClass';
import { formatMoney } from '../formatMoney';
import puppeteer from 'puppeteer';

export const paymentPDFMiddleSeller = () => {
  const middleware = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const pvData: INewPV = req.body.pvData;
      const newFact: IFactura = req.body.newFact;

      const base64_encode = (file: string): string => {
        const bitmap = fs.readFileSync(file);
        return Buffer.from(bitmap).toString('base64');
      };

      const pvStr = zfill(newFact.pv, 5);
      const nroStr = zfill(newFact.cbte, 8);
      const logo64 = base64_encode(
        path.join('public', 'images', 'invoices', 'logo.png'),
      );

      const encabezado = {
        factNro: `${pvStr}-${nroStr}`,
        fechaFact: moment(newFact.fecha, 'YYYY-MM-DD').format('DD/MM/YYYY'),
        letra: newFact.letra,
        codFact: 'NO VÁLIDO COMO COMPROBANTE FISCAL',
      };

      const cbteAsoc = false || '';

      const footer = {
        logo: 'data:image/png;base64,' + logo64,
        logoAfip1: '',
        logoAfip2: '',
        codQR: '',
        caeNro: '',
        caeVto: '',
        vendedor: newFact.seller_name || '',
      };

      const myCss = fs.readFileSync(
        path.join('public', 'css', 'style.css'),
        'utf8',
      );

      let condIvaStr = '';
      let condIvaStrCliente = '';

      const condIvaMap: Record<number, string> = {
        [condFiscalIva['IVA Responsable Inscripto']]:
          'IVA Responsable Inscripto',
        [condFiscalIva['IVA Sujeto Exento']]: 'IVA Sujeto Exento',
        [condFiscalIva['Responsable Monotributo']]: 'Responsable Monotributo',
        [condFiscalIva['Consumidor Final']]: 'Consumidor Final',
      };

      condIvaStr = condIvaMap[pvData.cond_iva] || '';
      condIvaStrCliente = condIvaMap[newFact.cond_iva_cliente] || '';

      const ptoVta = {
        razSocOrigen: pvData.raz_soc,
        direccionOrigen: pvData.direccion,
        condIvaOrigen: condIvaStr,
        emailOrigen: pvData.email,
        cuitOrigen: pvData.cuit,
        iibbOrigen: pvData.iibb,
        iniAct: moment(pvData.ini_act, 'YYYY-MM-DD').format('DD/MM/YYYY'),
      };

      const cliente = {
        clienteEmail: newFact.email_cliente || '',
        clienteName: newFact.raz_soc_cliente || 'Consumidor Final',
        clienteNro: newFact.n_doc_cliente || '',
        tipoDoc: newFact.tipo_doc_cliente === 80 ? 'CUIT' : 'DNI',
        condIvaCliente: condIvaStrCliente,
      };

      const totales = {
        subTotal: formatMoney(
          Math.abs(newFact.total_neto) + Math.abs(newFact.descuento),
        ),
        subTotalNoFiscal: formatMoney(
          Math.abs(newFact.total_neto) +
            Math.abs(newFact.total_iva) +
            Math.abs(newFact.descuento),
        ),
        totalIva: formatMoney(Math.abs(newFact.total_iva)),
        totalFact: formatMoney(Math.abs(newFact.total_fact)),
        totalDesc: formatMoney(newFact.descuento),
      };

      let formapagoStr = '';
      switch (newFact.forma_pago) {
        case 0:
          formapagoStr = 'EFECTIVO';
          break;
        case 1:
          formapagoStr = 'MERCADO PAGO';
          break;
        case 2:
          formapagoStr = 'DÉBITO';
          break;
        case 3:
          formapagoStr = 'CRÉDITO';
          break;
        case 4:
          formapagoStr = 'CUENTA CORRIENTE';
          break;
        default:
          formapagoStr = 'VARIOS';
          break;
      }

      const formaPago = {
        formaPago: formapagoStr,
      };

      const datos2 = {
        myCss: `<style>${myCss}</style>`,
        cbteAsoc,
        detalle: newFact.det_rbo,
        ...encabezado,
        ...ptoVta,
        ...cliente,
        ...totales,
        ...formaPago,
        ...footer,
      };

      const html = await ejs.renderFile(
        path.join('views', 'invoices', 'ReciboVende.ejs'),
        datos2,
      );

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
        margin: {
          left: '1.5cm',
          right: '1.5cm',
          top: '0.5cm',
        },
        printBackground: true,
      });

      await browser.close();

      req.body.fileName = fileName;
      req.body.filePath = filePath;
      req.body.formapagoStr = formapagoStr;

      next();
    } catch (error) {
      console.error(error);
      next(new Error('Faltan datos o hay datos erróneos, ¡controlelo!'));
    }
  };
  return middleware;
};
