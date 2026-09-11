import {getChatGPTUser} from '@/app/chatgpt-auth';
import {checkOrigin,isRecord,jsonError,listModels,readLimited} from '@/lib/ai';
export async function POST(r:Request){
 if(!await getChatGPTUser())return jsonError('Please sign in to use this workspace.',401);
 if(!checkOrigin(r))return jsonError('Request origin not allowed.',403);
 try{const raw=await readLimited(r,4096);if(!isRecord(raw))return jsonError('Invalid request.');const b=raw;if(typeof b.key!=='string'||b.key.length<20||b.key.length>250)return jsonError('Enter a valid Gemini API key.');
 const models=await listModels(b.key);if(!models.length)return jsonError('No supported chat models are available for this key.');return Response.json({models},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return jsonError(e instanceof Error?e.message:'Could not connect to Google.',400)}
}
