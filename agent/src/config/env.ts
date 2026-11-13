
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1024).max(65535).default(4317),
  WEB_APP_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://127.0.0.1:3000"),
  DOWNLOAD_TOKEN_PUBLIC_KEY: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Configuración inválida del agente:", parsed.error.flatten());
  process.exit(1);
}

const origins = parsed.data.WEB_APP_ORIGINS
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => {
    try {
      const url = new URL(origin);

      if (
        url.protocol !== "https:" &&
        !["localhost", "127.0.0.1"].includes(url.hostname)
      ) {
        throw new Error("Origen no permitido");
      }

      return url.origin;
    } catch {
      throw new Error(`WEB_APP_ORIGINS contiene un origen inválido: ${origin}`);
    }
  });

export const config = {
  port: parsed.data.PORT,
  host: "127.0.0.1",
  allowedOrigins: [...new Set(origins)],
  downloadTokenPublicKey: parsed.data.DOWNLOAD_TOKEN_PUBLIC_KEY,
};
