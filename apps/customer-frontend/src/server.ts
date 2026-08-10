import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
// Behind Render's proxy every request carries X-Forwarded-* headers; without trusting
// them Angular SSR deopts to CSR (serving index.csr.html) and reads the internal
// .onrender.com host instead of the real *.marketmiam.fr one.
const angularApp = new AngularNodeAppEngine({ trustProxyHeaders: true });

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use('/**', (req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

// pm_id is set when PM2 is the parent, which isMainModule can't detect.
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Unreferenced in the repo, but the Angular CLI dev-server and build import it.
export const reqHandler = createNodeRequestHandler(app);
