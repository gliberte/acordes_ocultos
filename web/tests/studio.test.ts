import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generatedStory, imageInput, safeSlug, editorialInput, potentialAnalysis, studioBody } from '../src/lib/studio-contract.ts';
import { parseDraft } from '../src/lib/studio-draft.ts';
import { generateFlow, withFlowLock } from '../src/lib/studio-flow.ts';
const story = {
 title:'Fixture', song:'Fixture',artist:'Fixture',slug:'artist-song',topic:'acordes-ocultos',audioMode:'official-library',
 scenes90s:Array.from({length:9},(_,i)=>({scene:i+1,subtitle:'Narración de prueba',prompt:'Photographic fixture'})),
 scenes60s:Array.from({length:9},(_,i)=>({scene:i+1,subtitle:'Resumen de prueba'})),
 copys:{instagram:'Copy',tiktok:'Copy'},chronicle:{title:'Crónica',markdown:'Texto'}
};
test('rejects shell arguments, traversal, malformed IDs and unordered scenes', () => {
 for (const slug of ['../story','../../../../tmp/file','a/b','a\\b','UPPER','a;echo','a'.repeat(121),'a\n']) assert.throws(()=>safeSlug(slug));
 for (const sceneNumber of ['1; echo test','1',0,10,{},null]) assert.throws(()=>imageInput({storyData:story,sceneNumber}));
 for (const sceneNumber of ['all','cover',1,9]) assert.equal(imageInput({storyData:story,sceneNumber}).sceneNumber,sceneNumber);
 assert.throws(()=>imageInput({storyData:story,force:'false'}));
 assert.throws(()=>generatedStory({...story,scenes90s:story.scenes90s.slice(1)}));
 assert.throws(()=>generatedStory({...story,scenes90s:[...story.scenes90s].reverse()}));
 assert.throws(()=>generatedStory({...story,chronicle:null}));
 assert.throws(()=>editorialInput({song:{},artist:'Artist'}));
 assert.throws(()=>editorialInput({song:'Song',artist:'Artist',category:'invalid'}));
 assert.equal(generatedStory(story).scenes90s.length,9);
});
test('rejects oversized and malformed HTTP bodies',async()=>{
 const request=(body:string)=>new Request('https://test.local',{method:'POST',headers:{'content-type':'application/json'},body});
 await assert.rejects(studioBody(request('{broken')));
 await assert.rejects(studioBody(request('x'.repeat(20)),10));
 assert.deepEqual(await studioBody(request('{"ok":true}')),{ok:true});
});
test('validates recoverable drafts and rejects unsafe URLs and unknown versions',()=>{
 const draft={version:1,revision:'fixture',updatedAt:new Date().toISOString(),step:3,song:'Fixture',artist:'Fixture',category:'acordes-ocultos',audioMode:'official-library',notes:'',storyData:story,analysis:null,images:{cover:'https://example.test/cover.png',1:'/videos/studio/a.png'}};
 assert.equal(parseDraft(JSON.stringify(draft)).storyData?.slug,story.slug);
 assert.throws(()=>parseDraft(JSON.stringify({...draft,version:2})));
 assert.throws(()=>parseDraft(JSON.stringify({...draft,images:{cover:'javascript:alert(1)'}})));
 assert.throws(()=>parseDraft(JSON.stringify({...draft,storyData:null})));
 assert.throws(()=>parseDraft('{invalid'));
});
test('editorial scoring cannot claim guaranteed virality or accept invalid scores',()=>{
 const analysis={score:8.5,verdict:'Hit Viral Garantizado',categoryRecommendation:'acordes-ocultos',oneLineHook:'Hook',humanConflict:'Conflict',viralComponents:['Human'],verdictDetail:'Editorial detail'};
 assert.doesNotMatch(potentialAnalysis(analysis).verdict,/garantizado/i);
 for (const score of [0,11,'9']) assert.throws(()=>potentialAnalysis({...analysis,score}));
});
test('flow jobs isolate output, preserve active JSON, require every image and release locks',async()=>{
 const root=await mkdtemp(join(tmpdir(),'studio-regression-'));
 try {
  await mkdir(join(root,'scripts'),{recursive:true});await mkdir(join(root,'src/data'),{recursive:true});
  const active=join(root,'src/data/story.json');await writeFile(active,'active-story-must-survive');
  await writeFile(join(root,'scripts/generate-flow-images.mjs'),`import fs from 'node:fs';import path from 'node:path';const story=JSON.parse(fs.readFileSync(process.argv[process.argv.indexOf('--story')+1],'utf8'));for(const src of [story.coverBg,...story.assets.map(a=>a.src)]){const target=path.join(process.cwd(),'public',src);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,Buffer.from([137,80,78,71,13,10,26,10,1]));}`);
  const first=await withFlowLock(root,()=>generateFlow(root,generatedStory(story),'all',true));
  const second=await withFlowLock(root,()=>generateFlow(root,generatedStory(story),'cover',true));
  assert.equal(first.files.length,10);assert.equal(second.files.length,1);assert.notEqual(first.outputRelative,second.outputRelative);
  assert.equal(await readFile(active,'utf8'),'active-story-must-survive');
  await writeFile(join(root,'scripts/generate-flow-images.mjs'),'// no output');
  await assert.rejects(withFlowLock(root,()=>generateFlow(root,generatedStory(story),'all',true)));
  await withFlowLock(root,async()=>{await assert.rejects(withFlowLock(root,async()=>null),/generación visual/);});
  await assert.rejects(withFlowLock(root,async()=>{throw new Error('worker failure');}));
  assert.equal(await withFlowLock(root,async()=>42),42);
 } finally { await rm(root,{recursive:true,force:true}); }
});
