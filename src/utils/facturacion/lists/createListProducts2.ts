import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import puppeteer from 'puppeteer';

type IProdListTier = {
  label: string;
  price: string;
};

type IProdListItem = {
  name: string;
  price: string;
  tiers: IProdListTier[];
};

export const createProdListPDF2 = async (prodList: IProdListItem[]) => {
  return new Promise(async (resolve, reject) => {
    try {
      const style = fs.readFileSync(
        path.join('views', 'reports', 'prodList2', 'styles.css'),
        'utf8',
      );

      const pageConfig = {
        size: 'A4',
        orientation: 'portrait',
        marginMm: 10,
      };
      const gridConfig = {
        columns: 4,
        rows: 5,
        gapMm: 5,
      };

      const dateNow = new Date();
      const fileName = `prodList-${dateNow.toISOString()}.pdf`;
      const location = path.join('public', 'prod-list', fileName);

      const itemsPerPage = gridConfig.columns * gridConfig.rows;
      const pages: IProdListItem[][] = [];

      for (let i = 0; i < prodList.length; i += itemsPerPage) {
        pages.push(prodList.slice(i, i + itemsPerPage));
      }

      const html = await ejs.renderFile(
        path.join('views', 'reports', 'prodList2', 'index.ejs'),
        {
          style: `<style>${style}</style>`,
          pages,
          totalPages: pages.length,
          pageConfig,
          gridConfig,
        },
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
        format: 'A4',
        landscape: false,
        printBackground: true,
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
        },
      });

      await browser.close();

      resolve({
        filePath: location,
        fileName,
      });
    } catch (error) {
      console.error('Error generando el PDF:', error);
      reject(error);
    }
  });
};
