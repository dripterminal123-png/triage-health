import {getChatGPTUser} from '@/app/chatgpt-auth';
export async function GET(){
  const user=await getChatGPTUser();
  return Response.json({user:user?{id:user.userId,displayName:user.displayName,email:user.email}:null},{headers:{'Cache-Control':'no-store'}});
}
