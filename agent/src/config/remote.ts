import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  CFDI_WEB_APP_URL: z.string().url(),
});

export function getRemoteConfig() {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    throw new Error(
      "Configura CFDI_WEB_APP_URL en el archivo .env del agente."
    );
  }

  const url = new URL(result.data.CFDI_WEB_APP_URL);

  if (
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(url.hostname)
  ) {
    throw new Error("La conexión remota debe utilizar HTTPS.");
  }

  return {
    baseUrl: url.origin,
  };
}