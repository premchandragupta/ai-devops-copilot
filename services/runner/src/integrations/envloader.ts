import fs from "node:fs";
import path from "node:path";
import * as dotenv from "dotenv";

// Find nearest .env from CWD up to 5 levels
function loadNearestEnv() {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const p = path.join(dir, ".env");
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      return p;
    }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}
loadNearestEnv();
