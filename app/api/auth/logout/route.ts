import {deleteCurrentSession,clearSessionCookie} from '@/app/chatgpt-auth';
import {checkOrigin} from '@/lib/ai';
export async function POST(r:Request){
  if(!checkOrigin(r))return Response.json({error:'Request origin not allowed.'},{status:403});
  await deleteCurrentSession();
  return Response.json({ok:true},{headers:{'Set-Cookie':clearSessionCookie(r.url),'Cache-Control':'no-store'}});
}
