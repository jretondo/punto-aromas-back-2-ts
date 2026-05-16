import fs from 'fs';
import path from 'path';

export type IInvoiceAuditSnapshot = {
  requestId: string;
  startedAt: string;
  rawRequest: unknown;
  user: {
    id?: number;
    email?: string;
    nombre?: string;
    apellido?: string;
  };
  calculated?: {
    newFact: unknown;
    productsList: unknown;
    variosPagos: unknown;
  };
};

type IInvoiceAuditFinalData = IInvoiceAuditSnapshot & {
  finishedAt: string;
  factId: number;
  insertedDetails: unknown;
  resultInsert: unknown;
};

const cloneForAudit = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

const pad = (value: number): string => {
  const text = String(value);
  return text.length === 1 ? `0${text}` : text;
};

const getDateFolder = (date: Date): string => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
};

const sanitizeFilePart = (value: string): string => {
  return value.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 120);
};

const createRequestId = (): string => {
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${random}`;
};

export const buildInvoiceAuditSnapshot = (
  body: Record<string, any>,
): IInvoiceAuditSnapshot => {
  const dataFact = body.dataFact || {};
  const requestId = String(
    body.requestId ||
      body.operationId ||
      dataFact.requestId ||
      dataFact.operationId ||
      createRequestId(),
  );
  const user = body.user || {};

  return {
    requestId,
    startedAt: new Date().toISOString(),
    rawRequest: cloneForAudit({
      dataFact: body.dataFact,
      fiscal: body.fiscal,
      sendEmail: body.sendEmail,
    }),
    user: {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      apellido: user.apellido,
    },
  };
};

export const attachCalculatedInvoiceAudit = (
  audit: IInvoiceAuditSnapshot,
  newFact: unknown,
  productsList: unknown,
  variosPagos: unknown,
): IInvoiceAuditSnapshot => {
  return {
    ...audit,
    calculated: cloneForAudit({
      newFact,
      productsList,
      variosPagos,
    }),
  };
};

export const writeInvoiceAudit = (
  audit: IInvoiceAuditSnapshot | undefined,
  factId: number,
  insertedDetails: unknown,
  resultInsert: unknown,
): string | undefined => {
  if (!audit) {
    return undefined;
  }

  const finishedAt = new Date();
  const folder = path.join(
    'logs',
    'invoices-audit',
    getDateFolder(finishedAt),
  );
  fs.mkdirSync(folder, { recursive: true });

  const fileName = `fact-${factId}-${sanitizeFilePart(audit.requestId)}.json`;
  const filePath = path.join(folder, fileName);
  const data: IInvoiceAuditFinalData = {
    ...audit,
    finishedAt: finishedAt.toISOString(),
    factId,
    insertedDetails: cloneForAudit(insertedDetails),
    resultInsert: cloneForAudit(resultInsert),
  };

  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return filePath;
};
