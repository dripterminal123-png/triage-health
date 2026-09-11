import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs';
fs.mkdirSync('work',{recursive:true});
await build({entryPoints:['lib/retrieval.ts'],bundle:true,platform:'node',format:'esm',outfile:'work/retrieval.mjs'});
const {retrieve}=await import('../work/retrieval.mjs');
for(const [q,expected] of [['asthma attack wheezing','asthma'],['low blood glucose hypoglycemia','glucose'],['pregnant maternal warning signs','maternal'],['stress anxiety','stress']]){assert(retrieve(q).some(s=>s.sourceId.startsWith(expected)),q)}
assert.equal(retrieve('xqzbnmlk').length,0);
await build({entryPoints:['app/api/chat/route.ts'],bundle:true,platform:'node',format:'esm',outfile:'work/chat.mjs',plugins:[{name:'test-auth',setup(b){b.onResolve({filter:/chatgpt-auth$/},()=>({path:'auth',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export async function getChatGPTUser(){return globalThis.testUser}',loader:'js'}));}}]});
const {POST}=await import('../work/chat.mjs');
const body={key:'test-only-placeholder-key',model:'gemini-test',messages:[{role:'user',content:'I have asthma.'},{role:'assistant',content:'When did this start?'},{role:'user',content:'Today I am wheezing.'}],profile:{age:'Adult (18–64)',conditions:'Asthma',medications:'',allergies:'',pregnancy:'Not provided'},documents:[]};
const request=(data=body,origin='https://example.test')=>new Request('https://example.test/api/chat',{method:'POST',headers:{'Content-Type':'application/json',origin},body:JSON.stringify(data)});
globalThis.testUser=null;assert.equal((await POST(request())).status,401);
globalThis.testUser={userId:'test-user'};assert.equal((await POST(request(body,'https://untrusted.test'))).status,403);
assert.equal((await POST(request({...body,documents:[{name:'bad.pdf',type:'application/pdf',data:'YWJj'}]}))).status,400);
let captured;
globalThis.fetch=async(url,opts)=>{captured=JSON.parse(opts.body);return new Response('data: '+JSON.stringify({candidates:[{content:{parts:[{text:'Source-supported answer [S1]'}]}}]})+'\n\n',{status:200})};
const r=await POST(request());assert.equal(r.status,200);const events=(await r.text()).trim().split('\n').map(JSON.parse);
assert.equal(captured.contents.length,3);assert(captured.contents[0].parts[0].text.includes('asthma'));assert(captured.systemInstruction.parts[0].text.includes('RETRIEVED EVIDENCE'));assert(events[0].sources.length>0);assert(events.some(e=>e.type==='delta'));assert.equal(events.at(-1).type,'done');
globalThis.fetch=async()=>new Response('{}',{status:429});assert.equal((await POST(request())).status,502);
globalThis.fetch=async()=>new Response('data: '+JSON.stringify({promptFeedback:{blockReason:'SAFETY'}})+'\n\n');const blocked=await (await POST(request())).text();assert(blocked.includes('"type":"error"'));
const docs=JSON.parse(fs.readFileSync('lib/knowledge/documents.json'));const chunks=JSON.parse(fs.readFileSync('lib/knowledge/chunks.json'));assert.equal(docs.length,20);assert.equal(docs.filter(d=>d.format==='PDF').length,5);for(const d of docs){assert(chunks.some(c=>c.sourceId===d.id));if(d.local)assert(fs.readFileSync('public'+d.local).subarray(0,5).equals(Buffer.from('%PDF-')))}
console.log('PASS: retrieval relevance and empty queries; authenticated access; origin rejection; invalid PDF rejection; complete chat history; evidence injection and citations; streaming; quota and blocked-response errors; all 20 sources and 5 PDF assets.');
