/**
 * Generate the ten early-game vector backdrops (white house + forest) into
 * `early/`. SVG only — `render.ts` rasterizes and thresholds them.
 */
import { readdirSync } from 'node:fs';
import { Scene } from './kit.mjs';

const files = readdirSync(new URL('./scenes/', import.meta.url))
  .filter(f => /^\d\d-.*\.mjs$/.test(f)).sort();

export const scenes = [];
for (const f of files) {
  const mod = (await import(`./scenes/${f}`)).default;
  scenes.push({ ...mod, file: f, out: `early/${f.replace(/\.mjs$/, '.svg')}` });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const s of scenes) {
    const S = Scene({ seed: s.seed });
    s.draw(S);
    const bytes = S.write(s.out);
    console.log(`${s.out.padEnd(34)} ${String(bytes).padStart(9)} bytes   ${s.title}`);
  }
}
