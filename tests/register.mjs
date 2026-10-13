// Lets `node --test` load the app's TypeScript/TSX directly (see loader.mjs). No extra packages:
// it uses the project's own `typescript` to transpile, the way the build would.
import { register } from "node:module";

register("./loader.mjs", import.meta.url);
