
import ExcelJS from "exceljs";
import { XMLParser } from "fast-xml-parser";
import { readFile } from "node:fs/promises";

import {
  getXmlDocumentPaths,
  saveExcelFile,
} from "./download-storage.js";

type XmlNode = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  parseAttributeValue: false,
  trimValues: true,
});

function asNode(value: unknown): XmlNode {
  if (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as XmlNode;
  }

  return {};
}

function firstNode(value: unknown): XmlNode {
  if (Array.isArray(value)) {
    return asNode(value[0]);
  }

  return asNode(value);
}

function attribute(
  node: XmlNode,
  name: string
): string {
  const value = node[`@_${name}`];

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function nestedNode(
  node: XmlNode,
  name: string
): XmlNode {
  return asNode(node[name]);
}

function numberValue(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export async function generateCfdiExcel(jobId: string) {
  const xmlPaths = await getXmlDocumentPaths(jobId);

  if (xmlPaths.length === 0) {
    return {
      excelPath: null,
      documentsProcessed: 0,
      invalidDocuments: 0,
    };
  }

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "CFDI Local";
  workbook.subject = "Reporte de comprobantes fiscales";
  workbook.title = "CFDI descargados";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("CFDI");

  worksheet.columns = [
    { header: "UUID", key: "uuid", width: 40 },
    { header: "Tipo", key: "tipo", width: 12 },
    { header: "Serie", key: "serie", width: 14 },
    { header: "Folio", key: "folio", width: 16 },
    { header: "Fecha", key: "fecha", width: 23 },
    { header: "RFC emisor", key: "rfcEmisor", width: 18 },
    { header: "Nombre emisor", key: "nombreEmisor", width: 35 },
    { header: "RFC receptor", key: "rfcReceptor", width: 18 },
    { header: "Nombre receptor", key: "nombreReceptor", width: 35 },
    { header: "Subtotal", key: "subtotal", width: 16 },
    { header: "Descuento", key: "descuento", width: 16 },
    { header: "Total", key: "total", width: 16 },
    { header: "Moneda", key: "moneda", width: 12 },
    { header: "Tipo cambio", key: "tipoCambio", width: 14 },
    { header: "Método pago", key: "metodoPago", width: 16 },
    { header: "Forma pago", key: "formaPago", width: 16 },
    { header: "Uso CFDI", key: "usoCfdi", width: 14 },
    { header: "Exportación", key: "exportacion", width: 14 },
    { header: "Lugar expedición", key: "lugarExpedicion", width: 18 },
    { header: "Archivo XML", key: "archivo", width: 40 },
  ];

  const errors: {
    fileName: string;
    error: string;
  }[] = [];

  let documentsProcessed = 0;

  for (const filePath of xmlPaths) {
    try {
      const xml = await readFile(filePath, "utf8");

      const parsed = parser.parse(xml);

      const comprobante = asNode(parsed.Comprobante);

      if (Object.keys(comprobante).length === 0) {
        throw new Error(
          "No se encontró el elemento Comprobante."
        );
      }

      const emisor = nestedNode(
        comprobante,
        "Emisor"
      );

      const receptor = nestedNode(
        comprobante,
        "Receptor"
      );

      const complemento = nestedNode(
        comprobante,
        "Complemento"
      );

      const timbre = firstNode(
        complemento.TimbreFiscalDigital
      );

      worksheet.addRow({
        uuid: attribute(timbre, "UUID"),
        tipo: attribute(comprobante, "TipoDeComprobante"),
        serie: attribute(comprobante, "Serie"),
        folio: attribute(comprobante, "Folio"),
        fecha: attribute(comprobante, "Fecha"),
        rfcEmisor: attribute(emisor, "Rfc"),
        nombreEmisor: attribute(emisor, "Nombre"),
        rfcReceptor: attribute(receptor, "Rfc"),
        nombreReceptor: attribute(receptor, "Nombre"),
        subtotal: numberValue(
          attribute(comprobante, "SubTotal")
        ),
        descuento: numberValue(
          attribute(comprobante, "Descuento")
        ),
        total: numberValue(
          attribute(comprobante, "Total")
        ),
        moneda: attribute(comprobante, "Moneda"),
        tipoCambio: numberValue(
          attribute(comprobante, "TipoCambio")
        ),
        metodoPago: attribute(comprobante, "MetodoPago"),
        formaPago: attribute(comprobante, "FormaPago"),
        usoCfdi: attribute(receptor, "UsoCFDI"),
        exportacion: attribute(comprobante, "Exportacion"),
        lugarExpedicion: attribute(
          comprobante,
          "LugarExpedicion"
        ),
        archivo: filePath.split(/[\\/]/).pop() ?? "",
      });

      documentsProcessed++;
    } catch (error) {
      errors.push({
        fileName: filePath.split(/[\\/]/).pop() ?? filePath,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido al interpretar XML.",
      });
    }
  }

  const header = worksheet.getRow(1);

  header.font = {
    bold: true,
    color: {
      argb: "FFFFFFFF",
    },
  };

  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "FF166534",
    },
  };

  header.alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  header.height = 25;

  worksheet.views = [
    {
      state: "frozen",
      ySplit: 1,
    },
  ];

  worksheet.autoFilter = {
    from: "A1",
    to: "T1",
  };

  for (const key of [
    "subtotal",
    "descuento",
    "total",
    "tipoCambio",
  ]) {
    const column = worksheet.getColumn(
      worksheet.columns.findIndex(
        (item) => item.key === key
      ) + 1
    );

    column.numFmt = "#,##0.00";
  }

  if (errors.length > 0) {
    const errorSheet = workbook.addWorksheet("Errores XML");

    errorSheet.columns = [
      { header: "Archivo", key: "fileName", width: 45 },
      { header: "Error", key: "error", width: 80 },
    ];

    for (const item of errors) {
      errorSheet.addRow(item);
    }

    errorSheet.getRow(1).font = {
      bold: true,
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();

  const excelPath = await saveExcelFile(
    jobId,
    Buffer.from(buffer)
  );

  console.log("[EXCEL] Reporte generado:", excelPath);
  console.log("[EXCEL] CFDI procesados:", documentsProcessed);
  console.log("[EXCEL] XML con errores:", errors.length);

  return {
    excelPath,
    documentsProcessed,
    invalidDocuments: errors.length,
  };
}
