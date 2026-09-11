export const API='https://generativelanguage.googleapis.com/v1beta';
export function jsonError(message:string,status=400){const h:Record<string,string>={'Cache-Control':'no-store'};return Response.json({error:message},{status,headers:h})}
export function checkOrigin(r:Request){const origin=r.headers.get('origin');return !origin || origin===new URL(r.url).origin;}
export function isRecord(value:unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
export async function readLimited(r:Request,max:number): Promise<unknown>{
 if(Number(r.headers.get('content-length')||0)>max)throw new Error('Request too large. Remove an attachment and try again.');
 const reader=r.body?.getReader(); if(!reader)throw new Error('Empty request');let size=0;const parts:Uint8Array[]=[];
 while(true){const v=await reader.read();if(v.done)break;size+=v.value.length;if(size>max){await reader.cancel();throw new Error('Request too large. Remove an attachment and try again.')}parts.push(v.value);}
 const data=new Uint8Array(size);let offset=0;for(const p of parts){data.set(p,offset);offset+=p.length;}return JSON.parse(new TextDecoder().decode(data));
}
type GeminiModelResponse={name:string;displayName?:string;supportedGenerationMethods?:string[]};
type GeminiModelsResponse={models?:GeminiModelResponse[]};
export async function listModels(key:string){
 const r=await fetch(API+'/models?pageSize=1000',{headers:{'x-goog-api-key':key},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new Error(r.status===429?'Google is rate limiting this key. Try again shortly.':'Google could not accept this key. Check that it is active and has Gemini API access.');
 const j=await r.json() as GeminiModelsResponse;return (j.models||[]).filter(m=>m.supportedGenerationMethods?.includes('generateContent')&&/gemini/.test(m.name)&&!/image|tts|robotics|embedding|computer|deep-research/.test(m.name)).map(m=>({id:m.name.replace('models/',''),name:m.displayName||m.name}));
}
