import fs from 'node:fs';
import {parseEnv} from 'node:util';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../package.json',import.meta.url));
const {chromium}=require('playwright');
const env=parseEnv(fs.readFileSync(new URL('../.env',import.meta.url),'utf8'));
const base=process.env.ADMIN_TEST_BASE_URL || 'http://localhost:4328';
const login=await fetch(base+'/api/admin/login',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({password:env.ADMIN_PASSWORD})});assert.equal(login.status,200);
const value=login.headers.get('set-cookie').split(';')[0].split('=')[1];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext();await context.addCookies([{name:'acordes_admin_session',value,url:base,httpOnly:true,sameSite:'Strict'}]);
 const page=await context.newPage();await page.goto(base+'/admin/estudio');
 const inputs=page.locator('input[type="text"][placeholder^="ej."]');await inputs.nth(0).fill('Borrador de regresión');await inputs.nth(1).fill('Artista de prueba');
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('acordes_studio_draft_v1')||'{}').song==='Borrador de regresión');
 await page.reload();await inputs.nth(0).waitFor();await page.waitForFunction(()=>document.querySelector('input[placeholder^="ej."]')?.value==='Borrador de regresión');
 assert.equal(await inputs.nth(1).inputValue(),'Artista de prueba');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar borrador'}).click();assert.match((await download).suggestedFilename(),/estudio\.json$/);
 const other=await context.newPage();await other.goto(base+'/admin/estudio');await other.locator('input[type="text"][placeholder^="ej."]').nth(0).fill('Cambio en otra pestaña');
 await page.getByRole('status').filter({hasText:'Otra pestaña cambió'}).waitFor();
 console.log(JSON.stringify({browserChecks:['autosave','reload recovery','export','cross-tab conflict'],paidApisInvoked:false}));
 await context.close();
}finally{await browser.close();}
