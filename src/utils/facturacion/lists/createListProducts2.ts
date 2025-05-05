import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import { IProdPrinc } from 'interfaces/Itables';
import puppeteer from 'puppeteer';

export const createProdListPDF2 = async (
    prodList: Array<{imagen: string,
      nombre: string,
      marca: string, 
      proveedor: string}>
  ) => {
    return new Promise(async (resolve, reject) => {
      const base64_encode = (filePath: string): string => {
        const bitmap: Buffer = fs.readFileSync(filePath);
        return Buffer.from(bitmap).toString('base64');
      };
  
      try {
        const estilo = fs.readFileSync(
          path.join('views', 'reports', 'cajaList', 'styles.css'),
          'utf8'
        );
        const logo = base64_encode(
          path.join('public', 'images', 'invoices', 'logo.png')
        );
  
        const dateNow = new Date();
        const fileName = `prodList-${dateNow.toISOString()}.pdf`;
        const location = path.join('public', 'prod-list', fileName);
  
        const datos = {
          logo: 'data:image/png;base64,' + logo,
          style: '<style>' + estilo + '</style>',
          productos: prodList,
        };
  
        const html = await ejs.renderFile(
          path.join('views', 'reports', 'prodList', 'index.ejs'),
          datos
        );
  
        const browser = await puppeteer.launch({
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          executablePath:
            process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
          timeout: 0,
        });
  
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
  
        await page.pdf({
          path: location,
          format: 'a4',
          landscape: false,
          scale: 1,
          displayHeaderFooter: true,
          margin: {
            top: '0.5cm',
            bottom: '2cm',
          },
          headerTemplate: '',
          footerTemplate:
            "<div style='font-size: 14px; text-align: center; width: 100%;'>Página&nbsp;<span class='pageNumber'></span>&nbsp;de&nbsp;<span class='totalPages'></span></div>",
        });
  
        await browser.close();
  
        const dataFact = {
          filePath: location,
          fileName: fileName,
        };
  
        resolve(dataFact);
      } catch (error) {
        console.error('Error generando el PDF:', error);
        reject(error);
      }
    });
  };