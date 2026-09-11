import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {checkOrigin,isRecord,jsonError,readLimited} from '@/lib/ai';
export async function GET(){
 try{await env.DB!.prepare(`CREATE TABLE IF NOT EXISTS health_workspaces (user_id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0)`).run();}catch{return jsonError('Your saved workspace could not be initialized. Please reload.',503)}
 const user=await getChatGPTUser();if(!user)return jsonError('Please sign in to open your saved workspace.',401);
 try{const row=await env.DB!.prepare('SELECT data,revision FROM health_workspaces WHERE user_id=?').bind(user.userId).first<{data:string,revision:number}>();return Response.json(row?{data:JSON.parse(row.data),revision:row.revision}:{data:null,revision:0},{headers:{'Cache-Control':'no-store'}});}catch{return jsonError('Your saved workspace could not be loaded. Please reload before editing.',503)}
}
export async function PUT(r:Request){
 if(!checkOrigin(r))return jsonError('Request origin not allowed.',403);
 const user=await getChatGPTUser();if(!user)return jsonError('Please sign in to save.',401);
 try{await env.DB!.prepare(`CREATE TABLE IF NOT EXISTS health_workspaces (user_id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0)`).run();const raw=await readLimited(r,600000);if(!isRecord(raw))return jsonError('Workspace is invalid.');const b=raw;if(!Number.isInteger(b.revision)||!b.data||!isRecord(b.data)||!Array.isArray(b.data.chats)||b.data.chats.length>60||!b.data.profile)return jsonError('Workspace is too large or invalid. Delete older conversations.');
 const data=JSON.stringify({chats:b.data.chats,profile:b.data.profile});
 await env.DB!.prepare('INSERT OR IGNORE INTO health_workspaces(user_id,data,revision) VALUES(?,?,0)').bind(user.userId,'{}').run();
 const result=await env.DB!.prepare('UPDATE health_workspaces SET data=?,revision=revision+1 WHERE user_id=? AND revision=?').bind(data,user.userId,b.revision).run();
 if(!result.meta.changes)return jsonError('This workspace changed in another tab. Reload before continuing; export this conversation first if needed.',409);
 return Response.json({revision:b.revision+1},{headers:{'Cache-Control':'no-store'}});
 }catch{return jsonError('Could not save. Your changes remain on screen; use Retry save.',503)}
}
