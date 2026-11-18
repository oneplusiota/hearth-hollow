const MOODS={cozy:{bpm:78,scale:[0,2,4,5,7,9,11],root:50,density:.64,drum:.055,flute:.055},merry:{bpm:116,scale:[0,2,4,5,7,9,10],root:50,density:.92,drum:.12,flute:.075},wistful:{bpm:66,scale:[0,2,3,5,7,8,10],root:50,density:.48,drum:.025,flute:.06},mystic:{bpm:72,scale:[0,2,3,5,7,9,10],root:50,density:.58,drum:.04,flute:.075}};
class Tavern extends AudioWorkletProcessor{
 constructor(){super();this.mood='cozy';this.pending='cozy';this.voices=[];this.tick=0;this.until=0;this.degree=7;this.motif=[7,9,8,7,5,7,9,8];this.chord=0;this.prog=[0,3,4,0];this.energy=.7;this.port.onmessage=e=>{if(MOODS[e.data.mood])this.pending=e.data.mood;};}
 random(a){return a[Math.floor(Math.random()*a.length)];}
 pitch(d){const m=MOODS[this.mood];return m.root+m.scale[((d%7)+7)%7]+12*Math.floor(d/7);}
 note(degree,kind,amp,duration,pan=0){const f=440*Math.pow(2,(this.pitch(degree)-69)/12);const v={kind,amp,life:0,len:Math.floor(duration*sampleRate),f,pan,phase:0};if(kind==='pluck'){v.buf=new Float32Array(Math.round(sampleRate/f));let last=0;for(let i=0;i<v.buf.length;i++){last=(last+(Math.random()*2-1))*.5;v.buf[i]=last;}v.pos=0;}this.voices.push(v);if(this.voices.length>40)this.voices.shift();}
 step(){const pos=this.tick%8,bar=Math.floor(this.tick/8);if(pos===0){if(this.mood!==this.pending){this.mood=this.pending;this.degree=7;this.port.postMessage({mood:this.mood});}if(bar%8===0){this.prog=this.random([[0,3,4,0],[0,5,3,4],[0,4,5,3],[0,3,1,4]]);this.energy=Math.max(.4,Math.min(1,this.energy+(Math.random()-.5)*.25));this.motif=this.motif.map((x,i)=>Math.random()<.3?Math.max(4,Math.min(12,x+this.random([-1,1]))):x);}this.chord=this.prog[bar%4];}
 const m=MOODS[this.mood],beat=60/m.bpm;this.until+=sampleRate*beat/2;
 if(pos===0||pos===4)this.note(this.chord-7+(pos===4?4:0),'bass',.15,beat*1.8,-.1);
 const arp=[0,2,4,2,0,4,2,4];if(pos%2===0||this.mood==='merry'||Math.random()<.35)this.note(this.chord+arp[pos],'pluck',.22*(.8+Math.random()*.3),2,-.4);
 if(Math.random()<m.density*this.energy){let target=this.motif[pos];this.degree+=Math.sign(target-this.degree)*this.random([0,1,1,2]);this.degree=Math.max(4,Math.min(12,this.degree));if(pos===0||pos===6){const choices=[this.chord+7,this.chord+9,this.chord+11];this.degree=choices.reduce((a,b)=>Math.abs(b-this.degree)<Math.abs(a-this.degree)?b:a);this.degree=Math.min(13,this.degree);}this.note(this.degree,'flute',m.flute*(.8+Math.random()*.3),beat*this.random([.7,1,1.5]),.35);}
 if(pos===0||pos===4)this.note(0,'drum',m.drum,.2,0);else if(this.mood==='merry'&&pos%2===0)this.note(0,'tap',.035,.08,-.3);
 this.tick++;}
 process(inputs,outputs){const out=outputs[0];for(let i=0;i<out[0].length;i++){if(this.until<=0)this.step();this.until--;let l=0,r=0;for(let j=this.voices.length-1;j>=0;j--){let v=this.voices[j];if(v.life>=v.len){this.voices.splice(j,1);continue;}const t=v.life/sampleRate;let s=0;v.phase+=v.f/sampleRate;if(v.phase>1)v.phase-=1;
 if(v.kind==='pluck'){let p=v.pos,q=(p+1)%v.buf.length;s=v.buf[p];v.buf[p]=(s+v.buf[q])*.497;v.pos=q;s*=Math.min(1,v.life/100)*Math.min(1,(v.len-v.life)/800);}
 else if(v.kind==='flute'){const env=Math.min(1,t/.065)*Math.min(1,(v.len-v.life)/(sampleRate*.12));const p=2*Math.PI*v.phase+.015*Math.sin(t*32);s=(Math.sin(p)+.2*Math.sin(2*p)+.035*Math.sin(3*p))*env;}
 else if(v.kind==='bass'){s=(Math.sin(2*Math.PI*v.phase)+.16*Math.sin(4*Math.PI*v.phase))*Math.min(1,t/.025)*Math.exp(-t*2.6)*Math.min(1,(v.len-v.life)/600);}
 else if(v.kind==='drum')s=Math.sin(2*Math.PI*(75*t+4*(1-Math.exp(-t*30))))*Math.exp(-t*24)*Math.min(1,t/.003);
 else s=(Math.random()*2-1)*Math.exp(-t*80)*Math.min(1,t/.002);
 s*=v.amp;v.life++;l+=s*(1-v.pan)*.7;r+=s*(1+v.pan)*.7;}
 out[0][i]=Math.tanh(l);if(out[1])out[1][i]=Math.tanh(r);}return true;}
}
registerProcessor('tavern',Tavern);
