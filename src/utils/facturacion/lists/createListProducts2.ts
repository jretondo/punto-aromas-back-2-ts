import path from 'path';
import ejs from 'ejs';
import puppeteer from 'puppeteer';

type IProdListSourceItem = {
  name?: string;
  nombre?: string;
  category?: string;
  subcategory?: string;
  marca?: string;
  proveedor?: string;
  imagen?: string;
  url_img?: string;
};

type IProdListItem = {
  imagen: string;
  nombre: string;
  marca: string;
  proveedor: string;
};

type IProdListPage = {
  marca: string;
  productos: IProdListItem[];
};

const PUBLIC_STATIC_BASE_URL =
  'https://api-prod.nekoadmin.com.ar/punto-aroma/static/images/products/';

const PRODUCTS_PER_PAGE = 20;

const buildImageSrc = (image?: string): string => {
  const imagePath = image || 'product.png';

  if (/^(https?:|data:)/.test(imagePath)) {
    return imagePath;
  }

  const normalizedImagePath = imagePath
    .replace(/^public[\\/]/, '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');

  return new URL(normalizedImagePath, PUBLIC_STATIC_BASE_URL).toString();
};

const normalizeProduct = (product: IProdListSourceItem): IProdListItem => {
  return {
    imagen: buildImageSrc(product.imagen || product.url_img),
    nombre: product.nombre || product.name || '',
    marca: product.marca || product.subcategory || 'Sin marca',
    proveedor: product.proveedor || product.category || '',
  };
};

const compareText = (firstValue: string, secondValue: string): number => {
  return firstValue.localeCompare(secondValue, 'es', { sensitivity: 'base' });
};

const buildPagesByBrand = (productos: IProdListItem[]): IProdListPage[] => {
  const sortedProducts = [...productos].sort((firstProduct, secondProduct) => {
    const brandCompare = compareText(firstProduct.marca, secondProduct.marca);

    if (brandCompare !== 0) {
      return brandCompare;
    }

    return compareText(firstProduct.nombre, secondProduct.nombre);
  });

  return sortedProducts.reduce<IProdListPage[]>((pages, product) => {
    const currentPage = pages[pages.length - 1];
    const shouldCreatePage =
      !currentPage ||
      currentPage.marca !== product.marca ||
      currentPage.productos.length >= PRODUCTS_PER_PAGE;

    if (shouldCreatePage) {
      pages.push({
        marca: product.marca,
        productos: [],
      });
    }

    pages[pages.length - 1].productos.push(product);
    return pages;
  }, []);
};

export const createProdListPDF2 = async (prodList: IProdListSourceItem[]) => {
  return new Promise(async (resolve, reject) => {
    try {
      const productos = prodList.map(normalizeProduct);
      const pages = buildPagesByBrand(productos);
      const dateNow = new Date();
      const fileName = `prodList-${dateNow.toISOString()}.pdf`;
      const location = path.join('public', 'prod-list', fileName);

      const html = await ejs.renderFile(
        path.join('views', 'reports', 'prodList', 'index.ejs'),
        { pages },
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
