export type Player={loadVideoById:(id:string)=>void;cueVideoById:(id:string)=>void;playVideo:()=>void;pauseVideo:()=>void;destroy:()=>void;getVideoData:()=>{title?:string};getPlayerState:()=>number;getCurrentTime:()=>number;getDuration:()=>number;seekTo:(seconds:number,allowSeekAhead:boolean)=>void};
type Event={target:Player;data:number};
type API={Player:new(element:HTMLElement,options:{width:string;height:string;host:string;playerVars:Record<string,string|number>;events:{onReady:(e:Event)=>void;onStateChange:(e:Event)=>void;onError:(e:Event)=>void;onAutoplayBlocked:()=>void}})=>Player};
declare global {interface Window {YT?:API;onYouTubeIframeAPIReady?:()=>void;}}
let pending:Promise<API>|null=null;
export function youtubeAPI():Promise<API>{
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(pending)return pending;
 pending=new Promise((resolve,reject)=>{let script=document.getElementById('hollow-youtube-api') as HTMLScriptElement|null;
 const timeout=window.setTimeout(()=>{pending=null;script?.remove();reject(Error('YouTube took too long to load. Check your connection and retry.'));},15000);
 const previous=window.onYouTubeIframeAPIReady;
 window.onYouTubeIframeAPIReady=()=>{clearTimeout(timeout);previous?.();if(window.YT)resolve(window.YT);};
 if(!script){script=document.createElement('script');script.id='hollow-youtube-api';script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{clearTimeout(timeout);pending=null;script?.remove();reject(Error('YouTube could not load. Check your connection or content blocker.'));};document.head.appendChild(script);}
 });return pending;
}
