import {rmSync} from 'node:fs';
// Remove only retired compiler outputs from this package's dist directory.
for (const name of ['auth','popup']) for (const suffix of ['.js','.d.ts','.js.map','.d.ts.map'])
  rmSync(new URL('../dist/'+name+suffix, import.meta.url), {force:true});
