import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import puppeteer from 'puppeteer';

export const createProdListPDF = async (
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
    try {
      const style = fs.readFileSync(
        path.join('views', 'reports', 'prodList2', 'styles.css'),
        'utf8',
      );

      const dateNow = new Date();
      const fileName = `prodList-${dateNow.toISOString()}.pdf`;
      const location = path.join('public', 'prod-list', fileName);

      const pageConfig = {
        marginMm: 10,
        columns: 4,
        rows: 5,
        gapMm: 6,
      };

      const formatPrice = (value: unknown): string => {
        const numericValue = Number(value);
        const roundedValue = Number.isFinite(numericValue)
          ? Math.round(numericValue)
          : 0;

        return `$${roundedValue
          .toString()
          .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
      };

      const buildTier = (qty: unknown, price: unknown) => {
        const numericQty = Number(qty);
        const numericPrice = Number(price);

        if (!Number.isFinite(numericQty) || numericQty <= 0) {
          return null;
        }

        if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
          return null;
        }

        return {
          label: `${Math.round(numericQty)} UN`,
          price: formatPrice(numericPrice),
        };
      };

      const normalizedProducts = Object.values(
        productos.reduce((acc: Record<string, any>, item: any) => {
          const key = `${item.name || ''}::${item.subcategory || ''}`;
          if (!acc[key]) {
            acc[key] = {
              name: item.name,
              description: item.subcategory || '',
              price: formatPrice(item.minorista),
              tiers: [
                buildTier(item.cant_mayor1, item.mayorista_1),
                buildTier(item.cant_mayor2, item.mayorista_2),
                buildTier(item.cant_mayor3, item.mayorista_3),
              ].filter(Boolean),
            };
          }
          return acc;
        }, {}),
      );

      const labelsPerPage = pageConfig.columns * pageConfig.rows;
      const pages: Array<any[]> = [];

      for (let i = 0; i < normalizedProducts.length; i += labelsPerPage) {
        pages.push(normalizedProducts.slice(i, i + labelsPerPage));
      }

      const html = await ejs.renderFile(
        path.join('views', 'reports', 'prodList2', 'index.ejs'),
        {
          style: `<style>${style}</style>`,
          pages,
          pageConfig,
        },
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
