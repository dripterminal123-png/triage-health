import {env} from 'cloudflare:workers';
import {checkOrigin,isRecord,readLimited} from '@/lib/ai';
import {createSession,ensureAuthTables,verifyPassword} from '@/app/chatgpt-auth';
type Row={id:string;display_name:string;email:string;password_hash:string};
export async function POST(r:Request){
  if(!checkOrigin(r))return Response.json({error:'Request origin not allowed.'},{status:403});
  try{
    await ensureAuthTables();
    const raw=await readLimited(r,10000);
    if(!isRecord(raw))return Response.json({error:'Invalid request.'},{status:400});
    const b=raw;
    const email=String(b.email||'').trim().toLowerCase(),password=String(b.password||'');
    const row=await env.DB!.prepare('SELECT id,display_name,email,password_hash FROM triage_auth_users WHERE email=?').bind(email).first<Row>();
    if(!row||!(await verifyPassword(password,row.password_hash)))return Response.json({error:'Email or password is incorrect.'},{status:401});
    const session=await createSession(row.id,r.url);
    return Response.json({user:{id:row.id,displayName:row.display_name,email:row.email}},{headers:{'Set-Cookie':session.cookie,'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'Could not sign you in. Please try again.'},{status:503});}
}
