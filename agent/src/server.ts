import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import pairRouter from "./routes/pair.js";
import { config } from "./config/env.js";
import { startAgentWorker } from "./worker/worker.js";
import { processSatJob } from "./worker/job-handler.js";
import fielRouter from "./routes/fiel.js";
import downloadsRouter from "./routes/downloads.js";

const app = express();

app.disable("x-powered-by");
app.disable("etag");
app.set("trust proxy", false);

// Validación de host y origen.
app.use((req: Request, res: Response, next: NextFunction) => {
  const allowedHosts = [
    `127.0.0.1:${config.port}`,
    `localhost:${config.port}`,
  ];

  const host = req.headers.host?.toLowerCase();

  if (!host || !allowedHosts.includes(host)) {
    res.status(403).json({
      ok: false,
      error: "Host no autorizado.",
    });
    return;
  }

  const origin = req.headers.origin;

  if (!origin || !config.allowedOrigins.includes(origin)) {
    res.status(403).json({
      ok: false,
      error: "Origen no autorizado.",
    });
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method === "OPTIONS") {
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS",
    );

    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );

    if (
      req.headers["access-control-request-private-network"] === "true"
    ) {
      res.setHeader("Access-Control-Allow-Private-Network", "true");
    }

    res.status(204).end();
    return;
  }

  next();
});

// Permitir recibir los archivos .cer y .key codificados en Base64.
app.use(express.json({
  limit: "3mb",
}));

// Comprobar que el agente esté funcionando.
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    ok: true,
    service: "cfdi-local-agent",
    version: "0.1.0",
    status: "running",
  });
});

// Rutas de configuración de e.firma.
app.use("/fiel", fielRouter);

// Vinculación automática desde el dashboard.
app.use("/pair", pairRouter);

app.use("/downloads", downloadsRouter);

// Errores internos.
app.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    console.error("Error interno del agente:", error);

    res.status(500).json({
      ok: false,
      error: "Error interno del agente local.",
    });
  },
);

// Rutas inexistentes.
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    ok: false,
    error: "Endpoint no encontrado.",
  });
});

const server = app.listen(config.port, config.host, () => {
  console.log("--------------------------------------");
  console.log("       CFDI LOCAL - AGENTE");
  console.log("--------------------------------------");
  console.log("Estado:       Ejecutándose");
  console.log(`Dirección:    http://${config.host}:${config.port}`);
  console.log(`Puerto:       ${config.port}`);
  console.log("--------------------------------------");
  console.log("Orígenes autorizados:");

  for (const origin of config.allowedOrigins) {
    console.log(`- ${origin}`);
  }

  console.log("--------------------------------------");

  console.log("Iniciando worker de descargas CFDI...");

  void startAgentWorker(processSatJob).catch((error) => {
    console.error("Error fatal al iniciar el worker:", error);
  });
});

function shutdown() {
  console.log("\nCerrando agente local...");

  server.close(() => {
    console.log("Agente detenido.");
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);