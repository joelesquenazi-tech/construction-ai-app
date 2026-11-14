const test=require('node:test'),assert=require('node:assert/strict'),{pack,unpack}=require('../drawing-storage.js');
test('fallback preserves exact original file bytes, MIME, name and modification time',async()=>{
 const file=new File([new Uint8Array([0,255,80,68,70,10])],'original.pdf',{type:'application/pdf',lastModified:12345});
 const saved=await pack(file),restored=unpack(structuredClone(saved));
 assert.equal(restored.name,file.name);assert.equal(restored.type,file.type);assert.equal(restored.lastModified,file.lastModified);
 assert.deepEqual(new Uint8Array(await restored.arrayBuffer()),new Uint8Array(await file.arrayBuffer()));
 assert(saved.bytes instanceof ArrayBuffer);
});
test('legacy Blob/File records remain readable without migration; raster fallback stays a Blob',async()=>{
 const blob=new Blob(['raster'],{type:'image/png'});assert.equal(unpack(blob),blob);assert.equal(unpack(undefined),undefined);
 const restored=unpack(await pack(blob));assert.equal(restored.type,'image/png');assert.equal(await restored.text(),'raster');
 assert.equal(restored.name,undefined);
});
test('malformed byte records and non-file writes are rejected',async()=>{
 assert.throws(()=>unpack({drawing_bytes_version:1,bytes:'bad',type:'image/png'}));
 await assert.rejects(pack('bad'));
});
