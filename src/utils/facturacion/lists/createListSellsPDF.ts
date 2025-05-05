import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import { IFactura, IUser } from 'interfaces/Itables';
import ControllerPtoVta from '../../../api/components/ptosVta';
import ControllerUsers from '../../../api/components/user';
import moment from 'moment';
import { formatMoney } from '../../../utils/formatMoney';
import { zfill } from '../../../utils/cerosIzq';
import puppeteer from 'puppeteer';

export const createListSellsPDF = async (
    userId: number,
    ptoVtaId: number,
    desde: string,
    hasta: string,
    totales: Array<{ SUMA: number; forma_pago: number }>,
    totales2: Array<{ SUMA: number; tipo: number }>,
    totalCosto: number,
    data: Array<IFactura>,
    user: IUser
  ) => {
    return new Promise(async (resolve, reject) => {
      const base64_encode = (filePath: string): string => {
        const bitmap: Buffer = fs.readFileSync(filePath);
        return Buffer.from(bitmap).toString('base64');
      };
  
      try {
        const desdeStr = moment(desde, 'YYYY-MM-DD').format('DD/MM/YYYY');
        const hastaStr = moment(hasta, 'YYYY-MM-DD').format('DD/MM/YYYY');
  
        const estilo = fs.readFileSync(
          path.join('views', 'reports', 'cajaList', 'styles.css'),
          'utf8'
        );
        const logo = base64_encode(
          path.join('public', 'images', 'invoices', 'logo.png')
        );
  
        const dataPV = await ControllerPtoVta.get(ptoVtaId);
        const dataUser = await ControllerUsers.getUser(userId);
  
        const fileName = `${dataPV[0].raz_soc} (${dataPV[0].cuit}) - ${dataUser[0].nombre} ${dataUser[0].apellido} desde ${desde} al ${hasta}.pdf`;
        const location = path.join('public', 'caja-lists', fileName);
  
        const metodos = [
          { typeNumber: 0, typeStr: 'Efectivo' },
          { typeNumber: 1, typeStr: 'Mercado Pago' },
          { typeNumber: 2, typeStr: 'Débito' },
          { typeNumber: 3, typeStr: 'Crédito' },
          { typeNumber: 4, typeStr: 'Cuenta Corriente' },
          { typeNumber: 6, typeStr: 'Cheque' },
          { typeNumber: 7, typeStr: 'Transferencia' },
        ];
  
        const totaleslista: Array<{ tipoStr: string; totalStr: string }> = [];
  
        metodos.forEach((metodo) => {
          const total1 = totales.find(t => t.forma_pago === metodo.typeNumber)?.SUMA || 0;
          const total2 = totales2.find(t => t.tipo === metodo.typeNumber)?.SUMA || 0;
          const totalTipo = total1 + total2;
          totaleslista.push({
            tipoStr: metodo.typeStr,
            totalStr: String(formatMoney(totalTipo))
          });
        });
  
        const listaVtas: Array<{
          fecha: string;
          cliente: string;
          factura: string;
          formaPago: string;
          totalStr: string;
        }> = data.map((current) => {
          const fecha = moment(current.create_time).format('DD/MM/YYYY HH:mm') + ' hs';
          const clienteName = current.raz_soc_cliente;
          const cliente =
            clienteName === ''
              ? 'Consumidor Final'
              : `${clienteName} (${current.tipo_doc_cliente === 80 ? 'CUIT: ' : 'DNI: '}${current.n_doc_cliente})`;
          const factura = `${current.letra} ${zfill(current.pv, 5)} - ${zfill(current.cbte, 8)}`;
  
          const formaPagoStr = (() => {
            switch (current.forma_pago) {
              case 0: return 'Efectivo';
              case 1: return 'Mercado Pago';
              case 2: return 'Débito';
              case 3: return 'Crédito';
              case 4: return 'Cuenta Corriente';
              case 6: return 'Cheque';
              case 7: return 'Transferencia';
              case 5: return 'Varios Metodos';
              default: return 'Efectivo';
            }
          })();
  
          return {
            fecha,
            cliente,
            factura,
            formaPago: formaPagoStr,
            totalStr: formatMoney(current.total_fact) || '0.00'
          };
        });
  
        if (Number(user.admin) === 1) {
          totaleslista.push({
            tipoStr: 'Costo Total',
            totalStr: String(formatMoney(totalCosto))
          });
        }
  
        const datos = {
          logo: 'data:image/png;base64,' + logo,
          style: '<style>' + estilo + '</style>',
          ptoVtaStr: `(P.V.: ${dataPV[0].pv}) ${dataPV[0].direccion}`,
          usuarioStr: `(Usuario: ${dataUser[0].usuario}) ${dataUser[0].nombre} ${dataUser[0].apellido}`,
          desdeStr,
          hastaStr,
          totaleslista,
          listaVtas
        };
  
        const html = await ejs.renderFile(
          path.join('views', 'reports', 'cajaList', 'index.ejs'),
          datos
        );
  
        const browser = await puppeteer.launch({
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          executablePath:
            process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        });
  
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
  
        await page.pdf({
          path: location,
          format: 'legal',
          landscape: true,
          scale: 0.8,
          displayHeaderFooter: true,
          margin: {
            top: '0.5cm',
            bottom: '2cm'
          },
          headerTemplate: '',
          footerTemplate:
            "<div style='font-size: 14px; text-align: center; width: 100%;'>Página&nbsp;<span class='pageNumber'></span>&nbsp;de&nbsp;<span class='totalPages'></span></div>"
        });
  
        await browser.close();
  
        resolve({
          filePath: location,
          fileName: fileName
        });
  
      } catch (error) {
        console.error('Error generando PDF de lista de ventas:', error);
        reject(error);
      }
    });
  };