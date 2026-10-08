import fs from 'node:fs';
import { parseEnv } from 'node:util';
import assert from 'node:assert/strict';
const env=parseEnv(fs.readFileSync(new URL('../.env',import.meta.url),'utf8'));
const base=process.env.ADMIN_TEST_BASE_URL || 'http://localhost:4328';
const before=fs.readFileSync(new URL('../../src/data/story.json',import.meta.url),'utf8');
const request=(path,options={})=>fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(30000),...options});
let response=await request('/admin/estudio');assert.equal(response.status,302);
for(const name of ['analyze-potential','generate-story','generate-images']){
 response=await request('/api/admin/studio/'+name,{method:'POST',headers:{origin:base,'content-type':'application/json'},body:'{}'});assert.equal(response.status,401);
}
response=await request('/api/admin/login',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({password:env.ADMIN_PASSWORD})});assert.equal(response.status,200);
const cookie=response.headers.get('set-cookie').split(';')[0];
response=await request('/admin/estudio',{headers:{cookie}});assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
for(const name of ['analyze-potential','generate-story','generate-images']){
 response=await request('/api/admin/studio/'+name,{method:'POST',headers:{cookie,origin:base,'content-type':'application/json'},body:'{}'});assert.equal(response.status,400);
 response=await request('/api/admin/studio/'+name,{method:'POST',headers:{cookie,origin:'https://evil.test','content-type':'application/json'},body:'{}'});assert.equal(response.status,403);
}
response=await request('/api/admin/studio/generate-images',{method:'POST',headers:{cookie,origin:base,'content-type':'application/json'},body:JSON.stringify({storyData:{slug:'../../outside'},sceneNumber:'1; echo malicious'})});assert.equal(response.status,400);
assert.equal(fs.readFileSync(new URL('../../src/data/story.json',import.meta.url),'utf8'),before);
console.log(JSON.stringify({httpChecks:12,activeStoryPreserved:true,paidApisInvoked:false}));
