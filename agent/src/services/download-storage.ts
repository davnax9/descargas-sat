
import {
  mkdir,
  writeFile,
  readdir,
  readFile,
} from "node:fs/promises";

import { homedir } from "node:os";
import path from "node:path";

export function getDownloadDirectory(jobId: string) {
  return path.join(
    homedir(),
    "Downloads",
    "CFDI_Local",
    "Descargas",
    jobId
  );
}

export function getXmlDirectory(jobId: string) {
  return path.join(
    getDownloadDirectory(jobId),
    "XML"
  );
}

export function getExcelPath(jobId: string) {
  return path.join(
    getDownloadDirectory(jobId),
    "CFDI.xlsx"
  );
}

export async function saveZipPackage(
  jobId: string,
  packageId: string,
  base64Content: string
) {
  const directory = getDownloadDirectory(jobId);

  await mkdir(directory, {
    recursive: true,
  });

  const zipPath = path.join(
    directory,
    `${path.basename(packageId)}.zip`
  );

  await writeFile(
    zipPath,
    Buffer.from(base64Content, "base64")
  );

  return {
    directory,
    zipPath,
  };
}

export async function saveXmlDocument(
  jobId: string,
  fileName: string,
  content: string
) {
  const directory = getXmlDirectory(jobId);

  await mkdir(directory, {
    recursive: true,
  });

  const safeName = path.basename(fileName);

  const xmlPath = path.join(
    directory,
    safeName.toLowerCase().endsWith(".xml")
      ? safeName
      : `${safeName}.xml`
  );

  await writeFile(xmlPath, content, "utf8");

  return xmlPath;
}

export async function getXmlDocumentPaths(
  jobId: string
): Promise<string[]> {
  const directory = getXmlDirectory(jobId);

  try {
    const entries = await readdir(directory, {
      withFileTypes: true,
    });

    return entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.toLowerCase().endsWith(".xml")
      )
      .map((entry) => path.join(directory, entry.name))
      .sort();
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }
}

export async function readXmlDocuments(jobId: string) {
  const paths = await getXmlDocumentPaths(jobId);

  return Promise.all(
    paths.map(async (filePath) => ({
      fileName: path.basename(filePath),
      content: await readFile(filePath, "utf8"),
    }))
  );
}

export async function saveExcelFile(
  jobId: string,
  content: Buffer
) {
  const directory = getDownloadDirectory(jobId);

  await mkdir(directory, {
    recursive: true,
  });

  const excelPath = getExcelPath(jobId);

  await writeFile(excelPath, content);

  return excelPath;
}
