// Separate elemental fields; shared plumbing does not imply shared motion or silhouettes.
export const common = `
uniform float time, entry, fade, bloom, moving, fire, detail, quiet;
uniform vec3 tail[16];
varying vec2 vUv, clearance;
varying float vKind, vLane;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
vec3 flame(float u,float lane,float kind){
 if(kind>.5){
  float a=(lane-2.)*.48*(.7+bloom*.3);
  float lift=sin(u*3.141593)*(1.55-abs(lane-2.)*.12);
  float bow=sin(u*6.283185)*.27*pow(max(.001,sin(u*3.141593)),.6);
  bow+=sin(u*19.-time*1.7+lane*2.)*.035*sin(u*3.141593);
  return vec3(sin(a)*lift+cos(a)*bow,.22+cos(a)*lift,-.5-sin(u*3.141593)*.3);
 }
 float side=lane<.5?-1.:1.;
 float curl=sin(u*8.-time*1.7+lane*2.)*.09*u;
 return vec3(side*(.37+sin(u*3.141593)*.26)+curl,
 .07+u*1.45,-.12+sin(u*4.+lane*2.)*.32);
}
vec3 water(float u,float lane){
 float a=u*4.7+lane*3.141593+sin(time*.3)*.26;
 float r=.48+sin(u*3.141593)*.25;
 return vec3(sin(a)*r,.14+u*.88+sin(u*6.-time*.6)*.055,cos(a)*r*.8);
}
vec3 path(float u,float lane,float kind){
 if(kind>1.5){float f=clamp(u*15.,0.,14.999);int i=int(f);
  vec3 p=mix(tail[i],tail[i+1],fract(f));
  p.y+=.15+sin(u*3.141593)*mix(.1,.35,fire);
  p.x+=sin(u*8.-time+lane*3.)*.06;
  return p;
 }
 return fire>.5?flame(u,lane,kind):water(u,lane);
}`;

export const ribbonVertex = `${common}
attribute float kind,lane;
void main(){
 vUv=uv;vKind=kind;vLane=lane;
 vec4 p=modelViewMatrix*vec4(path(uv.x,lane,kind),1.);
 vec3 tangent=(modelViewMatrix*vec4(path(min(.999,uv.x+.004),lane,kind)-path(max(0.,uv.x-.004),lane,kind),0.)).xyz;
 vec2 side=normalize(vec2(-tangent.y,tangent.x)+vec2(.00001));
 float w=(.055+.14*sin(uv.x*3.141593))*pow(max(.001,sin(uv.x*3.141593)),.55);
 if(kind>.5&&kind<1.5)w*=.65;
 if(kind>1.5)w*=.7*(1.-uv.x);
 p.xy+=side*(uv.y*2.-1.)*w;
 vec4 body=modelViewMatrix*vec4(0.,.96,0.,1.);
 clearance=p.xy-body.xy*(p.z/body.z);
 gl_Position=projectionMatrix*p;
}`;

export const ribbonFragment = `${common}
void main(){
 float u=vUv.x,v=vUv.y;
 float end=smoothstep(0.,.08,u)*(1.-smoothstep(.68,1.,u));
 if(vKind>.5&&vKind<1.5)end=smoothstep(0.,.06,u)*(1.-smoothstep(.9,1.,u));
 float n=noise(vec2(u*9.-time*mix(.35,1.6,fire),v*4.+vLane*3.));
 float edge,alpha;vec3 color;
 if(fire>.5){
  float curl=(n-.5)*.65*u+sin(u*20.-time*2.3+vLane)*.06;
  float d=abs(v-.5+curl)*2.;
  edge=1.-smoothstep(.18,.88,d);
  float fine=noise(vec2(u*22.-time*2.4,v*7.+vLane*5.));
  float erosion=smoothstep(.29,.72,n*.7+fine*.3+(1.-u)*.12);
  float thread=pow(max(0.,1.-d),8.);
  color=mix(vec3(.24,.014,.024),vec3(.78,.075,.018),edge);
  color=mix(color,vec3(1.,.43,.08),thread*(.25+fine*.5));
  color=mix(color,vec3(1.,.76,.29),thread*pow(1.-u,3.)*.5);
  alpha=edge*end*erosion*.85;
  if(vKind>.5&&vKind<1.5)alpha*=bloom*smoothstep(.28,.72,n+bloom*.12);
 }else{
  float d=abs(v-.5+sin(u*7.-time*.65+vLane)*.08)*2.;
  edge=1.-smoothstep(.15,1.,d);
  float crest=pow(max(0.,1.-abs(v-.3-sin(u*9.-time*.6)*.04)*16.),3.);
  float flow=.5+.5*sin(u*8.-time*.9+vLane*2.);
  color=mix(vec3(.025,.18,.18),vec3(.19,.55,.46),edge*.8);
  color=mix(color,vec3(.62,.84,.72),crest*(.35+flow*.4));
  alpha=edge*end*(.25+n*.18)+crest*end*.3;
 }
 if(vKind>1.5)alpha*=moving*(1.-u);
 // Protect face and torso in projection, including rear and side views.
 float clear=smoothstep(.8,1.22,length(clearance/vec2(.31,.57)));
 alpha*=clear*entry*fade;
 if(alpha<.008)discard;
 gl_FragColor=vec4(color,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

export const groundVertex = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const groundFragment = `
uniform float time,entry,fade,bloom,fire,quiet;
varying vec2 vUv;
void main(){
 vec2 p=vUv*2.-1.;float r=length(p),a=atan(p.y,p.x);
 float line,alpha;vec3 color;
 if(fire>.5){
  float petal=.48+.17*cos(a*5.);
  line=exp(-pow((r-petal)/.018,2.));
  float inner=exp(-pow((r-(.25+.08*cos(a*5.+.6)))/.014,2.));
  float write=.4+.6*pow(.5+.5*sin(a*2.-time*.38),3.);
  alpha=(line+inner*.4)*write*(.25+bloom*.2);
  color=mix(vec3(.45,.09,.035),vec3(.92,.4,.12),line);
 }else{
  float wave=.53+sin(a*2.+time*.3)*.07;
  line=exp(-pow((r-wave)/.025,2.));
  float breakUp=.3+.7*pow(.5+.5*sin(a*3.-time*.22),3.);
  alpha=line*breakUp*.26;
  color=vec3(.19,.5,.43);
 }
 alpha*=entry*fade*(1.-smoothstep(.8,.98,r));
 if(alpha<.008)discard;gl_FragColor=vec4(color,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

export const particleVertex = `${common}
attribute float seed;varying float life;
void main(){
 float u=fract(seed+time*mix(.14,.36,fire));
 float lane=floor(seed*13.)/6.;
 vec3 p=fire>.5?flame(u,mod(lane,2.),0.):water(u,mod(lane,2.));
 p.x+=sin(seed*97.+u*5.)*.14*u;p.z+=cos(seed*73.+u*4.)*.14*u;
 p.y+=fire*u*u*.3;
 life=sin(u*3.141593)*(.25+bloom*.75)*entry*fade;
 vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
 gl_PointSize=clamp(mix(16.,10.,fire)/max(1.,-view.z),1.,5.);
}`;
export const particleFragment = `uniform float fire;varying float life;
void main(){vec2 p=gl_PointCoord-.5;p.y*=mix(.8,1.5,fire);float d=length(p)*2.;
 float alpha=pow(max(0.,1.-d),2.)*life*.65;
 if(alpha<.008)discard;gl_FragColor=vec4(mix(vec3(.55,.82,.74),vec3(1.,.46,.1),fire),alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
