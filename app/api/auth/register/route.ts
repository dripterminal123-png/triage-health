import {env} from 'cloudflare:workers';
import {checkOrigin,isRecord,readLimited} from '@/lib/ai';
import {createSession,ensureAuthTables,hashPassword} from '@/app/chatgpt-auth';
export async function POST(r:Request){
  if(!checkOrigin(r))return Response.json({error:'Request origin not allowed.'},{status:403});
  try{
    await ensureAuthTables();
    const raw=await readLimited(r,10000);
    if(!isRecord(raw))return Response.json({error:'Invalid request.'},{status:400});
    const b=raw;
    const displayName=String(b.displayName||'').trim(),email=String(b.email||'').trim().toLowerCase(),password=String(b.password||'');
    if(displayName.length<1||displayName.length>80)return Response.json({error:'Enter a name between 1 and 80 characters.'},{status:400});
    if(email.length<3||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return Response.json({error:'Enter a valid email address.'},{status:400});
    if(password.length<10||password.length>200)return Response.json({error:'Your password must be at least 10 characters.'},{status:400});
    const existing=await env.DB!.prepare('SELECT id FROM triage_auth_users WHERE email=?').bind(email).first<{id:string}>();
    if(existing)return Response.json({error:'An account with that email already exists. Log in instead.'},{status:409});
    const id=crypto.randomUUID();
    await env.DB!.prepare('INSERT INTO triage_auth_users(id,display_name,email,password_hash,created_at) VALUES(?,?,?,?,?)').bind(id,displayName,email,await hashPassword(password),Date.now()).run();
    const session=await createSession(id,r.url);
    return Response.json({user:{id,displayName,email}},{headers:{'Set-Cookie':session.cookie,'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'Could not create your account. Please try again.'},{status:503});}
}
