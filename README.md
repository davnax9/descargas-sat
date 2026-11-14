This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

###
Los -env que se van a utilizar son los siguientes: ejemplos

DATABASE_URL=[BD Neon en este caso]
AUTH_SECRET=[secret]
FIEL_ACTION_SECRET=[secret]
DOWNLOAD_TOKEN_SECRET=[secret]

Para el agent:

PORT=4317
WEB_APP_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
#CFDI_WEB_APP_URL=https://tu-dominio.vercel.app
CFDI_WEB_APP_URL=http://localhost:3000
FIEL_ACTION_SECRET=[secret mismo que en app de next]
DOWNLOAD_TOKEN_SECRET=[secret mismo que en app de next]

##
CREAR EXE INSTALADOR DE AGENTE
En carpeta raiz del proyecto ejecutar lo siguiente:
-Eliminar compilacion anterior
Remove-Item .\release\cfdi-local-agent\app\dist -Recurse -Force
-Copiar compilacion nueva
Copy-Item .\agent\dist .\release\cfdi-local-agent\app\dist -Recurse
-Actualiza archivos dependencias
Copy-Item .\agent\package.json .\release\cfdi-local-agent\app\package.json -Force
Copy-Item .\agent\package-lock.json .\release\cfdi-local-agent\app\package-lock.json -Force
-Instalar dependencias de produccion
cd .\release\cfdi-local-agent\app
npm ci --omit=dev

Debemos tener los runtimes en carpeta release/cfdi-local-agent/runtime

Recuerda que en agent hay una carpeta installer que contiene:
-register-task.ps1
-supervisor.ps1
-unregister-task.ps1
-CFDILocalAgent.iss