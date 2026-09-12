import assert from 'node:assert/strict';
import { normalizeExportSettings } from '../src/export-image.js';

const run=(name,fn)=>{fn();console.log('PASS '+name);};

run('export settings preserve supported alpha formats and exact dimensions',()=>{
  const value=normalizeExportSettings({width:2048,height:2048,format:'webp',quality:0.84,transparent:true,detail:'high',effects:false});
  assert.deepEqual(value,{width:2048,height:2048,format:'webp',mimeType:'image/webp',extension:'webp',quality:0.84,transparent:true,detail:'high',effects:false});
});

run('export settings respect GPU and pixel limits and disable JPEG alpha',()=>{
  const value=normalizeExportSettings({width:9000,height:9000,format:'jpeg',quality:4,transparent:true},{maxDimension:4096,maxPixels:8_000_000});
  assert.ok(value.width<=4096&&value.height<=4096&&value.width*value.height<=8_000_000);
  assert.equal(value.extension,'jpg');assert.equal(value.quality,1);assert.equal(value.transparent,false);
});
