import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import puppeteer from 'puppeteer';

export const createProdListPDF3 = async (
  productos: Array<{
    name: string;
    subcategory: string;
    name_var?: string;
    costo?: number | string | null;
    minorista?: number | string | null;
    mayorista_1?: number | string | null;
    mayorista_2?: number | string | null;
    mayorista_3?: number | string | null;
    revendedor?: number | string | null;
    supermercado?: number | string | null;
    cant_mayor1?: number | string | null;
    cant_mayor2?: number | string | null;
    cant_mayor3?: number | string | null;
  }>,
) => {
  return new Promise(async (resolve, reject) => {
    const base64_encode = (filePath: string): string => {
      const bitmap: Buffer = fs.readFileSync(filePath);
      return Buffer.from(bitmap).toString('base64');
    };

    try {
      const estilo = fs.readFileSync(
        path.join('views', 'reports', 'prodList3', 'styles.css'),
        'utf8',
      );
      const logo = base64_encode(
        path.join('public', 'images', 'invoices', 'logo.png'),
      );

      const dateNow = new Date();
      const fileName = `prodList-3-${dateNow.toISOString()}.pdf`;
      const location = path.join('public', 'prod-list', fileName);

      const datos = {
        logo: 'data:image/png;base64,' + logo,
        style: '<style>' + estilo + '</style>',
        prodList: productos,
      };

      const html = await ejs.renderFile(
        path.join('views', 'reports', 'prodList3', 'index.ejs'),
        datos,
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
        format: 'a4',
        landscape: false,
        scale: 0.8,
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
