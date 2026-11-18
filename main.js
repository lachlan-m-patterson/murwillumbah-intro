import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import terrain from './assets/terrain.json';
import heightURL from './assets/elevation.bin?url';
import waterURL from './assets/waterways.json?url';

const $ = s => document.querySelector(s);
const root = $('#experience');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reduced.matches, stage = 0, transition = null, visible = true;
const chapters = [
  {kicker:'THE SETTING',title:'A town.<br>A river.<br><em>A whole valley.</em>',copy:'Just south of the Queensland border, the Tweed River winds through northern New South Wales to the sea.',next:'Enter the valley',view:'THE TWEED VALLEY',target:[-9,0,0],camera:[15,45,50]},
  {kicker:'THE LANDSCAPE',title:'High ridges.<br><em>Low ground.</em>',copy:'The ranges of an ancient volcano cradle the Tweed Valley. Rivers thread through the hills and open onto a broad floodplain.',next:'Find the town',view:'FROM THE RANGES TO THE RIVER',target:[-8,0,2],camera:[9,27,32]},
  {kicker:'THE PLACE',title:'One river.<br><em>Two sides.</em>',copy:'Murwillumbah sits beside the Tweed. Across the river lies South Murwillumbah—the focus of this 2022 flood story.',next:'',view:'SOUTH MURWILLUMBAH',target:[-1,0,4.9],camera:[6,10.5,17]}
];
const {west:W,east:E,north:N,south:S,size:n} = terrain;
const width = (E-W)*111.32*Math.cos(28.3*Math.PI/180), depth = (N-S)*111.32;
const project = (lon,lat) => [(lon-(W+E)/2)*width/(E-W),((N+S)/2-lat)*depth/(N-S)];
let heights,renderer,scene,camera,controls,labels=[],rings=[],riverMaterials=[];
function height(lon,lat){
 const fx=THREE.MathUtils.clamp((lon-W)/(E-W)*(n-1),0,n-1.001),fy=THREE.MathUtils.clamp((N-lat)/(N-S)*(n-1),0,n-1.001);
 const x=Math.floor(fx),y=Math.floor(fy),u=fx-x,v=fy-y;
 return Math.max(0,THREE.MathUtils.lerp(THREE.MathUtils.lerp(heights[y*n+x],heights[y*n+x+1],u),THREE.MathUtils.lerp(heights[(y+1)*n+x],heights[(y+1)*n+x+1],u),v))*.0032;
}
function point(lon,lat,offset=.06){const [x,z]=project(lon,lat);return new THREE.Vector3(x,height(lon,lat)+offset,z);}
function addLabel(text,lon,lat,kind,stages,offset=.5){
 const el=document.createElement('div');el.className=`label ${kind}`;el.innerHTML=text;$('#labels').append(el);
 labels.push({el,pos:point(lon,lat,offset),stages,kind});
}
function marker(lon,lat,color,radius){
 const pos=point(lon,lat,.1);
 const dot=new THREE.Mesh(new THREE.SphereGeometry(radius*.24,16,12),new THREE.MeshBasicMaterial({color}));dot.position.copy(pos);scene.add(dot);
 const ring=new THREE.Mesh(new THREE.RingGeometry(radius*.8,radius,64),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.6,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.copy(pos);scene.add(ring);rings.push(ring);return ring;
}
function view(index,instant=false){
 stage=index;
 const c=chapters[index];
 $('#chapter').textContent=`0${index+1}`;$('#kicker').textContent=c.kicker;$('#title').innerHTML=c.title;$('#description').textContent=c.copy;$('#view-name').textContent=c.view;
 $('#next').hidden=index===2;$('#next').innerHTML=`${c.next} <span>↗</span>`;$('.story-end').hidden=index!==2;
 document.querySelectorAll('.step').forEach((b,i)=>{b.classList.toggle('active',i===index);if(i===index)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
 if(!camera)return;
 const mobile=innerWidth<=700;
 let dest=new THREE.Vector3(...c.camera),target=new THREE.Vector3(...c.target);
 if(mobile){dest=new THREE.Vector3(...[[20,65,66],[12,40,43],[7,19,23]][index]);target=new THREE.Vector3(...[[0,0,-14],[-2,0,-6],[1,0,1]][index]);}
 if(instant||reduced.matches){camera.position.copy(dest);controls.target.copy(target);transition=null;controls.update();}
 else transition={start:performance.now(),from:camera.position.clone(),to:dest,fromTarget:controls.target.clone(),toTarget:target};
}
async function init(){
 const [heightRes,waterRes]=await Promise.all([fetch(heightURL),fetch(waterURL)]);
 if(!heightRes.ok||!waterRes.ok)throw new Error('Map data could not be loaded');
 heights=new Int16Array(await heightRes.arrayBuffer());const waterways=await waterRes.json();
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(root.clientWidth,root.clientHeight);renderer.setClearColor(0x081c20,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 $('#scene').append(renderer.domElement);
 scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x0a2529,.008);
 camera=new THREE.PerspectiveCamera(39,root.clientWidth/root.clientHeight,.1,250);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.enableZoom=false;controls.enablePan=false;controls.minPolarAngle=.24;controls.maxPolarAngle=Math.PI*.43;controls.rotateSpeed=.45;controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_ROTATE;
 controls.addEventListener('start',()=>{transition=null;$('#drag-hint').textContent='Explore freely · ↺ to reset';});
 scene.add(new THREE.HemisphereLight(0xd9e9d5,0x142c2e,2.5));
 const sun=new THREE.DirectionalLight(0xffedc9,3.4);sun.position.set(-30,25,-15);scene.add(sun);
 const fill=new THREE.DirectionalLight(0x6eb8ba,1.3);fill.position.set(30,10,20);scene.add(fill);
 const geo=new THREE.PlaneGeometry(width,depth,n-1,n-1);geo.rotateX(-Math.PI/2);
 const pos=geo.attributes.position,colors=new Float32Array(n*n*3),base=new THREE.Color(),low=new THREE.Color('#58776b'),high=new THREE.Color('#acb59a'),sea=new THREE.Color('#123f46');
 // Mask the sea from mapped coastal geometry, rather than treating all low land as water.
 const coast=waterways.filter(f=>f.kind==='coast'&&JSON.stringify(f.points[0])!==JSON.stringify(f.points.at(-1)));
 const shore=Array.from({length:n},(_,row)=>{
   const lat=N-row/(n-1)*(N-S),crossings=[];
   for(const f of coast)for(let i=1;i<f.points.length;i++){
     const [ax,ay]=f.points[i-1],[bx,by]=f.points[i];
     if((ay<=lat&&by>lat)||(by<=lat&&ay>lat))crossings.push(ax+(bx-ax)*(lat-ay)/(by-ay));
   }
   if(crossings.length)return Math.max(...crossings);
   // Beyond the NSW linework, find the sea-facing edge of the DEM's zero-height ocean.
   for(let col=n-1;col>=0;col--)if(heights[row*n+col]>1)return W+(col+1)/(n-1)*(E-W);
   return E;
 });
 for(let i=0;i<n*n;i++){
   const h=heights[i],ocean=W+(i%n)/(n-1)*(E-W)>shore[Math.floor(i/n)];pos.setY(i,ocean?0:Math.max(h,0)*.0032);
   if(ocean)base.copy(sea);else base.copy(low).lerp(high,Math.min(Math.max(h,0)/1100,1));
   colors[i*3]=base.r;colors[i*3+1]=base.g;colors[i*3+2]=base.b;
 }
 geo.setAttribute('color',new THREE.BufferAttribute(colors,3));geo.computeVertexNormals();
 const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0});
 mat.onBeforeCompile=shader=>{
   shader.vertexShader='varying float vElevation;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvElevation = position.y;');
   shader.fragmentShader='varying float vElevation;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float level = vElevation / 0.16;
    float edge = abs(fract(level - 0.5) - 0.5) / max(fwidth(level), 0.001);
    float contour = 1.0 - smoothstep(0.0, 1.0, edge);
    diffuseColor.rgb *= 1.0 - contour * 0.17 * smoothstep(0.06, 0.2, vElevation);`);
 };
 scene.add(new THREE.Mesh(geo,mat));
 // Vertical cut edges turn the terrain into a floating cartographic relief.
 const perimeter=[];for(let x=0;x<n;x++)perimeter.push(x);for(let y=1;y<n;y++)perimeter.push(y*n+n-1);for(let x=n-2;x>=0;x--)perimeter.push((n-1)*n+x);for(let y=n-2;y>=0;y--)perimeter.push(y*n);
 const sideVertices=[];for(let j=0;j<perimeter.length-1;j++){let a=perimeter[j],b=perimeter[j+1];let ax=pos.getX(a),az=pos.getZ(a),ay=pos.getY(a),bx=pos.getX(b),bz=pos.getZ(b),by=pos.getY(b);sideVertices.push(ax,ay,az,ax,-1.1,az,bx,by,bz,bx,by,bz,ax,-1.1,az,bx,-1.1,bz);}
 const sideGeo=new THREE.BufferGeometry();sideGeo.setAttribute('position',new THREE.Float32BufferAttribute(sideVertices,3));sideGeo.computeVertexNormals();scene.add(new THREE.Mesh(sideGeo,new THREE.MeshStandardMaterial({color:0x203b36,side:THREE.DoubleSide,roughness:1})));
 // Official NSW watercourse linework, draped on the DEM; no flood surface.
 for(const feature of waterways){
  let sections=[],section=[];
  for(const [lon,lat] of feature.points){if(lon>=W&&lon<=E&&lat>=S&&lat<=N)section.push(point(lon,lat,feature.kind==='coast'?.025:.055));else if(section.length){sections.push(section);section=[];}}if(section.length)sections.push(section);
  for(const pts of sections){if(pts.length<2)continue;
   const primary=feature.name.toLowerCase()==='tweed river';
   const material=new THREE.LineBasicMaterial({color:feature.kind==='coast'?0x6b9e94:primary?0xc0f6e5:0x7ecbc4,transparent:true,opacity:feature.kind==='coast'?.45:primary?.95:.5});
   scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),material));
   if(primary){
    const curve=new THREE.CurvePath();for(let i=1;i<pts.length;i++)curve.add(new THREE.LineCurve3(pts[i-1],pts[i]));
    const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.min(pts.length*2,1800),.032,5,false),new THREE.MeshBasicMaterial({color:0xabe8db,transparent:true,opacity:.8}));scene.add(tube);riverMaterials.push(tube.material);
   }
  }
 }
 marker(153.397,-28.326,0xd5eac0,.42);const southRing=marker(153.403,-28.335,0xf1bf7f,.45);southRing.userData.south=true;
 addLabel('Murwillumbah',153.393,-28.325,'town',[0,1,2],.8);
 addLabel('South Murwillumbah',153.408,-28.339,'south',[2],.7);
 addLabel('WOLLUMBIN<span class="sub">MOUNT WARNING</span>',153.271,-28.398,'mountain',[0,1],.7);
 addLabel('Tweed Heads',153.538,-28.175,'',[0],.4);
 addLabel('Pacific Ocean',153.61,-28.29,'water',[0],.1);
 addLabel('Tweed River',153.456,-28.286,'water',[0,1,2],.25);
 addLabel('Rous River',153.423,-28.272,'water',[1],.3);
 addLabel('BORDER RANGES',153.18,-28.28,'mountain',[1],.8);
 addLabel('QUEENSLAND',153.40,-28.12,'mountain',[0],.4);
 addLabel('NEW SOUTH WALES',153.30,-28.22,'mountain',[0],.6);
 view(0,true);
 $('#loading').style.opacity=0;setTimeout(()=>$('#loading').remove(),650);
 let last=0;
 function animate(t){requestAnimationFrame(animate);if(!visible||document.hidden)return;if(t-last<28)return;last=t;
  if(transition){let u=Math.min((t-transition.start)/2200,1);u=u*u*(3-2*u);camera.position.lerpVectors(transition.from,transition.to,u);controls.target.lerpVectors(transition.fromTarget,transition.toTarget,u);if(u===1)transition=null;}
  controls.update();
  for(const ring of rings){const pulse=paused?1:1+Math.sin(t*.0015)*.16;ring.scale.setScalar(pulse);ring.visible=!ring.userData.south||stage===2;}
  for(const m of riverMaterials)m.opacity=paused?.8:.77+Math.sin(t*.0009)*.1;
  for(const label of labels){const p=label.pos.clone().project(camera);const x=(p.x*.5+.5)*root.clientWidth,y=(-p.y*.5+.5)*root.clientHeight;
   const show=label.stages.includes(stage)&&p.z<1&&p.z>-1&&x>10&&x<root.clientWidth-10&&y>65&&y<root.clientHeight-100;
   label.el.style.opacity=show?1:0;label.el.style.left=x+'px';label.el.style.top=y+'px';
  }
  $('#compass').style.transform=`rotate(${-controls.getAzimuthalAngle()}rad)`;
  renderer.render(scene,camera);
 }
 requestAnimationFrame(animate);
 new ResizeObserver(()=>{camera.aspect=root.clientWidth/root.clientHeight;camera.updateProjectionMatrix();renderer.setSize(root.clientWidth,root.clientHeight);view(stage,true);}).observe(root);
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{threshold:0}).observe(root);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();showError('The 3D view was interrupted. Reload to return to the valley.');});
}
function showError(message){const loader=$('#loading');if(loader)loader.remove();const el=document.createElement('div');el.className='fallback';el.innerHTML=`<h2>The Tweed Valley</h2><p>Murwillumbah sits on the Tweed River in northern NSW. The ranges lie to the west; the river winds northeast to the sea. South Murwillumbah lies across the river from the town centre.</p><p>${message}</p><button class="next" onclick="location.reload()">Try again ↻</button>`;root.append(el);}
$('#next').onclick=()=>view(Math.min(stage+1,2));
document.querySelectorAll('.step').forEach(b=>b.onclick=()=>view(Number(b.dataset.step)));
$('.wordmark').onclick=e=>{e.preventDefault();view(0);};
$('#reset').onclick=()=>{view(stage);$('#drag-hint').textContent='Drag to explore the landscape';};
function updateMotion(){ $('#motion').textContent=paused?'▷':'Ⅱ';$('#motion').setAttribute('aria-label',paused?'Resume ambient motion':'Pause ambient motion');$('#motion').title=paused?'Resume ambient motion':'Pause ambient motion'; }
$('#motion').onclick=()=>{paused=!paused;updateMotion();};updateMotion();
reduced.addEventListener('change',()=>{paused=reduced.matches;updateMotion();if(reduced.matches)view(stage,true);});
$('#about').onclick=()=>$('#info').showModal();$('.close').onclick=()=>$('#info').close();$('#info').addEventListener('click',e=>{if(e.target===$('#info')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await root.requestFullscreen();}catch{$('#fullscreen').hidden=true;}};
document.addEventListener('fullscreenchange',()=>$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen'));
document.addEventListener('keydown',e=>{if($('#info').open||e.target.matches('button,a'))return;if(e.key==='ArrowRight'){e.preventDefault();view(Math.min(stage+1,2));}if(e.key==='ArrowLeft'){e.preventDefault();view(Math.max(stage-1,0));}});
init().catch(e=>{console.error(e);showError('This device could not open the 3D map. You can still continue to the flood story below.');});
