import { publicSignal } from '@/lib/signal-private';
export function GET(request:Request){const raw=new URL(request.url).searchParams.get('id')??'0';const id=Number(raw);if(!Number.isInteger(id)||id<0||id>5)return Response.json({error:'Unknown transmission'},{status:400});return Response.json(publicSignal(id),{headers:{'Cache-Control':'public, max-age=3600'}});}
