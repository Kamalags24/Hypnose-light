const canvas=document.getElementById('polyrhythmCanvas'),ctx=canvas.getContext('2d');
canvas.width=window.innerWidth;canvas.height=window.innerHeight;
const audioContext=new(window.AudioContext||window.webkitAudioContext)();
let isPlaying=false,animationId,tempo=120,angles=new Array(22).fill(0),lastTime=0,particles=[],particleAmount=750,glowEffect=true,showHarmonics=false,reverbAmount=0.1,beatEnabled=false;
const scales={
major:[262,294,330,349,392,440,494,523,587,659,698,784,880,988,1047,1175,1319,1397,1568,1760,1976,2093],
minor:[262,294,311,349,392,415,466,523,587,622,698,784,880,932,1047,1175,1245,1397,1568,1661,1865,2093],
pentatonic:[262,294,330,392,440,523,587,659,784,880,1047,1175,1319,1568,1760,2093,2349,2637,3136,3520,4186,4698],
blues:[262,311,349,370,392,466,523,622,698,740,784,932,1047,1245,1397,1480,1568,1865,2093,2489,2794,2960],
chromatic:Array.from({length:22},(_,i)=>220*Math.pow(2,i/12))
};
let currentScale='major',frequencies=scales[currentScale];
const colors=['#FF0000','#FF7F00','#FFFF00','#00FF00','#0000FF','#4B0082','#8B00FF','#FF1493','#00FFFF','#FF69B4','#1E90FF','#32CD32','#FFD700','#FF6347','#00FA9A','#9370DB','#20B2AA','#FF4500','#00CED1','#FF8C00','#8A2BE2','#00FF7F'];
let convolver=audioContext.createConvolver();
function generateImpulseResponse(duration,decay){
const sampleRate=audioContext.sampleRate,length=sampleRate*duration,impulse=audioContext.createBuffer(2,length,sampleRate),left=impulse.getChannelData(0),right=impulse.getChannelData(1);
for(let i=0;i<length;i++){const t=i/sampleRate;left[i]=right[i]=(Math.random()*2-1)*Math.pow(1-t/duration,decay);}
return impulse;
}
convolver.buffer=generateImpulseResponse(0.5,2);
function initializeCircles(){
const centerX=canvas.width/2,centerY=canvas.height/2,maxRadius=Math.min(centerX,centerY)*0.95;
return frequencies.map((freq,index)=>({x:centerX,y:centerY,radius:maxRadius*((index+1)/frequencies.length),color:colors[index],frequency:freq,divisions:index+1}));
}
let circles=initializeCircles();
class Particle{
constructor(x,y,color){this.x=x;this.y=y;this.color=color;this.size=Math.random()*4+1;this.speedX=Math.random()*3-1.5;this.speedY=Math.random()*3-1.5;this.life=255;}
update(){this.x+=this.speedX;this.y+=this.speedY;this.life-=5;if(this.size>0.2)this.size-=0.1;}
draw(){ctx.beginPath();ctx.arc(this.x,this.y,this.size,0,Math.PI*2);ctx.fillStyle=`rgba(${parseInt(this.color.slice(1,3),16)},${parseInt(this.color.slice(3,5),16)},${parseInt(this.color.slice(5,7),16)},${this.life/255})`;ctx.fill();}
}
function drawCircle(circle){
ctx.beginPath();ctx.arc(circle.x,circle.y,circle.radius,0,Math.PI*2);ctx.strokeStyle=circle.color;ctx.lineWidth=2;ctx.stroke();
if(showHarmonics){for(let i=0;i<circle.divisions;i++){const angle=(i/circle.divisions)*Math.PI*2,x=circle.x+Math.cos(angle)*circle.radius,y=circle.y+Math.sin(angle)*circle.radius;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fillStyle=circle.color;ctx.fill();}}
}
function drawBeat(circle,angle){
const x=circle.x+Math.cos(angle)*circle.radius,y=circle.y+Math.sin(angle)*circle.radius;
ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fillStyle='white';ctx.fill();
if(glowEffect){ctx.shadowColor=circle.color;ctx.shadowBlur=15;ctx.beginPath();ctx.arc(x,y,12,0,Math.PI*2);ctx.fillStyle=circle.color;ctx.fill();ctx.shadowBlur=0;}
for(let i=0;i<5;i++)particles.push(new Particle(x,y,circle.color));
return{x,y};
}
function drawParticles(){
for(let i=particles.length-1;i>=0;i--){particles[i].update();particles[i].draw();if(particles[i].life<=0)particles.splice(i,1);}
}
function playSound(frequency){
const now=audioContext.currentTime,oscillator=audioContext.createOscillator(),gainNode=audioContext.createGain(),panNode=audioContext.createStereoPanner();
oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,now);
gainNode.gain.setValueAtTime(0.2,now);gainNode.gain.exponentialRampToValueAtTime(0.01,now+0.5);
panNode.pan.setValueAtTime((Math.random()*0.8)-0.4,now);
oscillator.connect(gainNode);gainNode.connect(panNode);
const dryGain=audioContext.createGain(),wetGain=audioContext.createGain();
dryGain.gain.setValueAtTime(1-reverbAmount,now);wetGain.gain.setValueAtTime(reverbAmount,now);
panNode.connect(dryGain);panNode.connect(convolver);convolver.connect(wetGain);
dryGain.connect(audioContext.destination);wetGain.connect(audioContext.destination);
oscillator.start(now);oscillator.stop(now+0.5);
}

// Beat generation
let kickBuffer, hihatBuffer;
fetch('https://cdn.freesound.org/previews/171/171104_2394245-lq.mp3')
  .then(response => response.arrayBuffer())
  .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
  .then(audioBuffer => { kickBuffer = audioBuffer; });
fetch('https://cdn.freesound.org/previews/250/250547_3410897-lq.mp3')
  .then(response => response.arrayBuffer())
  .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
  .then(audioBuffer => { hihatBuffer = audioBuffer; });

function playBeat(time) {
  if (!beatEnabled) return;
  const kickSource = audioContext.createBufferSource();
  kickSource.buffer = kickBuffer;
  kickSource.connect(audioContext.destination);
  kickSource.start(time);

  [0, 0.5, 1, 1.5].forEach(offset => {
    const hihatSource = audioContext.createBufferSource();
    hihatSource.buffer = hihatBuffer;
    hihatSource.connect(audioContext.destination);
    hihatSource.start(time + offset * 60 / tempo);
  });
}

let lastBeatTime = 0;
function animate(time){
ctx.fillStyle='rgba(0,0,0,0.1)';ctx.fillRect(0,0,canvas.width,canvas.height);
const deltaTime=(time-lastTime)/1000;lastTime=time;
circles.forEach((circle,index)=>{
drawCircle(circle);
angles[index]+=(deltaTime*(tempo/16)*circle.divisions)/60;
if(angles[index]>=Math.PI*2){angles[index]-=Math.PI*2;playSound(circle.frequency);}
drawBeat(circle,angles[index]);
});
drawParticles();
while(particles.length>particleAmount)particles.shift();

if (beatEnabled && time - lastBeatTime >= 60000 / tempo) {
  playBeat(audioContext.currentTime);
  lastBeatTime = time;
}

animationId=requestAnimationFrame(animate);
}
function playPause(){
if(isPlaying){cancelAnimationFrame(animationId);audioContext.suspend();}else{lastTime=performance.now();audioContext.resume();animate(lastTime);}
isPlaying=!isPlaying;
}
function updateTempo(newTempo){tempo=newTempo;document.getElementById('tempoValue').textContent=tempo;document.getElementById('bpm').textContent=tempo;}
function updateParticleAmount(newAmount){particleAmount=newAmount;document.getElementById('particleValue').textContent=particleAmount;}
function updateReverb(amount){reverbAmount=amount;convolver.buffer=generateImpulseResponse(0.5,1+reverbAmount*3);document.getElementById('reverbValue').textContent=amount.toFixed(2);}
function toggleGlow(){glowEffect=!glowEffect;}
function toggleHarmonics(){showHarmonics=!showHarmonics;}
function toggleBeat(){
beatEnabled=!beatEnabled;
document.getElementById('toggleBeat').textContent = beatEnabled ? 'Disable Beat' : 'Enable Beat';
}
function changeScale(newScale){currentScale=newScale;frequencies=scales[currentScale];circles=initializeCircles();document.getElementById('currentScale').textContent=newScale.charAt(0).toUpperCase()+newScale.slice(1);}
document.getElementById('playPause').addEventListener('click',playPause);
document.getElementById('tempoSlider').addEventListener('input',(e)=>updateTempo(parseInt(e.target.value)));
document.getElementById('particleSlider').addEventListener('input',(e)=>updateParticleAmount(parseInt(e.target.value)));
document.getElementById('reverbSlider').addEventListener('input',(e)=>updateReverb(parseFloat(e.target.value)));
document.getElementById('toggleGlow').addEventListener('click',toggleGlow);
document.getElementById('toggleHarmonics').addEventListener('click',toggleHarmonics);
document.getElementById('toggleBeat').addEventListener('click',toggleBeat);
document.getElementById('scaleSelect').addEventListener('change',(e)=>changeScale(e.target.value));
window.addEventListener('resize',()=>{canvas.width=window.innerWidth;canvas.height=window.innerHeight;circles=initializeCircles();});
circles.forEach(drawCircle);
updateReverb(0.1);