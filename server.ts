/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { appPromise } from "./api/index.js";

const PORT = 3000;

appPromise.then((app) => {
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`CaseMind AI running at http://0.0.0.0:${PORT}`);
    });
  }
}).catch((err) => {
  console.error("Failed to start CaseMind AI dev server:", err);
});
