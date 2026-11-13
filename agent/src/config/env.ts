
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1024).max(65535).default(4317),
  WEB_APP_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://127.0.0.1:3000"),
  DOWNLOAD_TOKEN_SECRET: z.string().min(32),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Error en la configuración del agente:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const origins = parsed.data.WEB_APP_ORIGINS
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => {
    try {
      const url = new URL(origin);

      if (url.origin !== origin.replace(/\/$/, "")) {
        throw new Error(`El origen debe contener solamente protocolo, dominio y puerto: ${origin}`);
      }

      return url.origin;
    } catch {
      throw new Error(`Origen web no válido: ${origin}`);
    }
  });

if (origins.length === 0) {
  throw new Error("Debes configurar al menos un origen web autorizado.");
}

export const config = {
  port: parsed.data.PORT,
  host: "127.0.0.1",
  allowedOrigins: [...new Set(origins)],
  downloadTokenSecret: parsed.data.DOWNLOAD_TOKEN_SECRET,
};
