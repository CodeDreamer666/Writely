import {resolveShape,getShapeAnchors} from './bubbleShapes.js';
// Card text metrics, shared by the workspace cards and the customization preview.
export const CARD_FONT="15px 'Source Serif 4', Georgia, serif";
export const CARD_LINE_HEIGHT=22.5;
// Expanded cards stop growing here; longer thoughts scroll inside a fixed silhouette.
export const CARD_MAX_WIDTH=340;
export const CARD_MAX_HEIGHT=300;
export const CARD_MIN_ROOM=150;

// Per-shape proportions: the width/height ratio a card aims for as text grows,
// the narrowest text column and the smallest silhouette that still reads as the shape.
const designs={
 rectangle:{ratio:2.1,minContent:96,minWidth:150,minHeight:60},
 'rounded-square':{ratio:2,minContent:96,minWidth:160,minHeight:84},
 'thought-cloud':{ratio:2.3,minContent:88,minWidth:190,minHeight:132},
};
const legacyDesign={ratio:1.6,minContent:96};
export const isResponsiveShape=id=>Object.hasOwn(designs,resolveShape(id).id);

let measureContext=null;const textWidths=new Map();
if(typeof document!=='undefined')document.fonts?.addEventListener?.('loadingdone',()=>textWidths.clear());
// Width of each authored line laid out on a single row, used to choose a column width.
export function naturalTextLines(text){
 const source=String(text||'An unfinished thought…');
 if(textWidths.has(source))return textWidths.get(source);
 if(!measureContext&&typeof document!=='undefined'){measureContext=document.createElement('canvas').getContext('2d');}
 if(measureContext)measureContext.font=CARD_FONT;
 const lines=source.split('\n').map(line=>measureContext?measureContext.measureText(line).width:[...line].length*7.4);
 if(textWidths.size>500)textWidths.clear();textWidths.set(source,lines);return lines;
}
const contentLimit=(id,maxWidth)=>{
 const shape=resolveShape(id).id,limit=Math.min(CARD_MAX_WIDTH,maxWidth||CARD_MAX_WIDTH);
 if(!designs[shape])return Math.max(60,limit/1.45);
 return Math.max(60,limit-horizontalInset(shape,limit,CARD_MAX_HEIGHT)*2);
};
// Choose a text column whose wrapped block keeps the shape's preferred aspect ratio.
export function cardContentWidth(id,text,maxWidth=CARD_MAX_WIDTH){
 const shape=resolveShape(id).id,design=designs[shape]||legacyDesign,lines=naturalTextLines(text),limit=contentLimit(shape,maxWidth);
 const longest=Math.max(...lines),area=lines.reduce((sum,width)=>sum+Math.max(width,24),0)*CARD_LINE_HEIGHT;
 const ideal=Math.sqrt(area*design.ratio);
 return Math.floor(Math.max(Math.min(design.minContent,limit),Math.min(limit,longest+6,Math.max(ideal,Math.min(longest+6,design.minContent*1.6)))));
}

// Rectangle: clean edges with slightly rounded corners.
const RECT_PAD_X=20,RECT_PAD_Y=16,RECT_RADIUS=10;
// Rounded speech: a generous, softly rounded silhouette.
const SPEECH_PAD=16;
const speechRadius=(w,h)=>Math.min(34,h*.42,w*.3);
// Thought cloud: rounded lobes are spaced around a soft core.
const CLOUD_PAD=8;
const lobeRadius=(w,h)=>Math.max(14,Math.min(28,Math.min(w,h)*.2));
const cloudCoreRadius=(w,h)=>Math.min(w,h)*.42;
// Keep the text's corners inside the softened core plus the fill between lobes.
const cloudInset=(w,h)=>Math.max(0,cloudCoreRadius(w,h)*.3-lobeRadius(w,h)*.35)+CLOUD_PAD;
function horizontalInset(shape,width,height){
 if(shape==='rectangle')return RECT_PAD_X;
 if(shape==='rounded-square')return SPEECH_PAD+speechRadius(width,height)*.3;
 const r=lobeRadius(width,height);return r+2+cloudInset(width,height);
}

const round=n=>Math.round(n*100)/100;
const rectPath=(x,y,w,h,r)=>`M ${round(x+r)} ${round(y)} H ${round(x+w-r)} A ${r} ${r} 0 0 1 ${round(x+w)} ${round(y+r)} V ${round(y+h-r)} A ${r} ${r} 0 0 1 ${round(x+w-r)} ${round(y+h)} H ${round(x+r)} A ${r} ${r} 0 0 1 ${round(x)} ${round(y+h-r)} V ${round(y+r)} A ${r} ${r} 0 0 1 ${round(x+r)} ${round(y)} Z`;

function layoutRectangle(contentWidth,contentHeight){
 const width=Math.max(designs.rectangle.minWidth,contentWidth+RECT_PAD_X*2),height=Math.max(designs.rectangle.minHeight,contentHeight+RECT_PAD_Y*2);
 return {width,height,path:rectPath(.5,.5,width-1,height-1,RECT_RADIUS),decorations:[],
  box:{left:(width-contentWidth)/2,top:(height-contentHeight)/2},anchors:{top:[.5,0],right:[1,.5],bottom:[.5,1],left:[0,.5]}};
}
function layoutSpeech(contentWidth,contentHeight){
 let width=contentWidth+SPEECH_PAD*2,height=contentHeight+SPEECH_PAD*2;
 for(let i=0;i<3;i++){const inset=SPEECH_PAD+speechRadius(width,height)*.3;width=Math.max(designs['rounded-square'].minWidth,contentWidth+inset*2);height=Math.max(designs['rounded-square'].minHeight,contentHeight+inset*2);}
 const r=speechRadius(width,height);
 return {width,height,path:rectPath(.5,.5,width-1,height-1,r),decorations:[],box:{left:(width-contentWidth)/2,top:(height-contentHeight)/2},anchors:{top:[.5,0],right:[1,.5],bottom:[.5,1],left:[0,.5]}};
}
// Sample a point and outward normal at distance t along a rounded rectangle's perimeter.
function roundedRectWalker(x,y,w,h,r){
 const straightX=w-2*r,straightY=h-2*r,arc=Math.PI*r/2,segments=[straightX,arc,straightY,arc,straightX,arc,straightY,arc],total=segments.reduce((a,b)=>a+b,0);
 const corner=(cx,cy,start,s)=>{const a=start+s/r;return {x:cx+r*Math.cos(a),y:cy+r*Math.sin(a),nx:Math.cos(a),ny:Math.sin(a)};};
 const at=t=>{
  t=((t%total)+total)%total;let i=0;while(i<segments.length-1&&t>segments[i]){t-=segments[i];i++;}
  switch(i){
   case 0:return {x:x+r+t,y,nx:0,ny:-1};case 1:return corner(x+w-r,y+r,-Math.PI/2,t);
   case 2:return {x:x+w,y:y+r+t,nx:1,ny:0};case 3:return corner(x+w-r,y+h-r,0,t);
   case 4:return {x:x+w-r-t,y:y+h,nx:0,ny:1};case 5:return corner(x+r,y+h-r,Math.PI/2,t);
   case 6:return {x,y:y+h-r-t,nx:-1,ny:0};default:return corner(x+r,y+r,Math.PI,t);
  }
 };
 return {total,at};
}
// The outer meeting point of two neighbouring lobes, on the side their outward normals face.
function circleIntersection(a,b){
 const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),along=(d*d+a.r*a.r-b.r*b.r)/(2*d),h=Math.sqrt(Math.max(0,a.r*a.r-along*along));
 const mx=a.x+along*dx/d,my=a.y+along*dy/d,p1={x:mx-h*dy/d,y:my+h*dx/d},p2={x:mx+h*dy/d,y:my-h*dx/d},nx=a.nx+b.nx,ny=a.ny+b.ny;
 return (p1.x-mx)*nx+(p1.y-my)*ny>(p2.x-mx)*nx+(p2.y-my)*ny?p1:p2;
}
function layoutCloud(contentWidth,contentHeight){
 const design=designs['thought-cloud'];
 let coreWidth=contentWidth+CLOUD_PAD*2,coreHeight=contentHeight+CLOUD_PAD*2;
 // Lobes and the softened core depend on the core's size, so settle the size in a few passes.
 for(let i=0;i<4;i++){
  const r=lobeRadius(coreWidth,coreHeight),inset=cloudInset(coreWidth,coreHeight);
  coreWidth=Math.max(design.minWidth-2*r,contentWidth+inset*2);coreHeight=Math.max(design.minHeight-2*r,contentHeight+inset*2);
 }
 const r=lobeRadius(coreWidth,coreHeight),margin=r+2,width=coreWidth+margin*2,body=coreHeight+margin*2,height=body;
 const core={x:margin,y:margin,w:coreWidth,h:coreHeight},center={x:width/2,y:body/2};
 const walker=roundedRectWalker(core.x,core.y,core.w,core.h,cloudCoreRadius(core.w,core.h));
 // Lobes overlap enough that the dips between them stay well outside the text.
 const count=Math.max(7,Math.round(walker.total/(r*1.35))),step=walker.total/count;
 const lobes=Array.from({length:count},(_,i)=>{const p=walker.at(i*step+step*.35);const size=r*(1+.12*Math.sin(i*2.4+1));return {x:p.x,y:p.y,nx:p.nx,ny:p.ny,r:size};});
 const meets=lobes.map((lobe,i)=>circleIntersection(lobe,lobes[(i+1)%count]));
 let path=`M ${round(meets[count-1].x)} ${round(meets[count-1].y)}`;
 lobes.forEach((lobe,i)=>{
  const from=meets[(i+count-1)%count],to=meets[i];
  const start=Math.atan2(from.y-lobe.y,from.x-lobe.x),end=Math.atan2(to.y-lobe.y,to.x-lobe.x),outward=Math.atan2(lobe.ny,lobe.nx);
  const span=((end-start)%(2*Math.PI)+2*Math.PI)%(2*Math.PI),reach=((outward-start)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
  const sweep=reach<span?1:0,length=sweep?span:2*Math.PI-span;
  path+=` A ${round(lobe.r)} ${round(lobe.r)} 0 ${length>Math.PI?1:0} ${sweep} ${round(to.x)} ${round(to.y)}`;
 });
 path+=' Z';
 const decorations=[];
 const extremes={left:Math.min(...lobes.map(l=>l.x-l.r)),right:Math.max(...lobes.map(l=>l.x+l.r)),top:Math.min(...lobes.map(l=>l.y-l.r)),bottom:Math.max(...lobes.map(l=>l.y+l.r))};
 return {width,height,path,decorations,box:{left:(width-contentWidth)/2,top:(body-contentHeight)/2},
  anchors:{top:[.5,(extremes.top+r*.25)/height],right:[(extremes.right-r*.25)/width,center.y/height],bottom:[.5,(extremes.bottom-r*.25)/height],left:[(extremes.left+r*.25)/width,center.y/height]}};
}
const builders={rectangle:layoutRectangle,'rounded-square':layoutSpeech,'thought-cloud':layoutCloud};

// Fit the card around a text column. The silhouette is generated for the actual
// dimensions, so lobes and curves keep their size instead of being stretched.
export function layoutCard(id,{contentWidth,textHeight=0,maxHeight=CARD_MAX_HEIGHT}={}){
 const shape=resolveShape(id),build=builders[shape.id];
 if(!build)return layoutLegacy(shape.id,contentWidth,textHeight,maxHeight);
 const naturalHeight=Math.max(CARD_LINE_HEIGHT,Math.ceil(textHeight));
 let contentHeight=naturalHeight,layout=build(contentWidth,contentHeight);
 for(let i=0;i<4&&layout.height>maxHeight+.5;i++){contentHeight=Math.max(CARD_LINE_HEIGHT*2,contentHeight-(layout.height-maxHeight));layout=build(contentWidth,contentHeight);}
 const scroll=contentHeight<naturalHeight-.5;
 // Rectangle and speech text starts by the corner buttons, so it wraps around them. Clouds keep
 // their text inside the lobes; reserving room there would let the text height feed back into its wrapping.
 return {path:layout.path,width:layout.width,height:layout.height,anchors:layout.anchors,decorations:layout.decorations,scroll,reserveControls:shape.id!=='thought-cloud',
  content:{left:layout.box.left,top:layout.box.top,width:contentWidth,height:contentHeight}};
}

// Saved notes may still use retired catalogue shapes; those keep their warped drawings.
const regions={rectangle:[36,36,200,100],oval:[55,44,188,99],heart:[77,59,175,95],
 'rounded-square':[38,38,200,105],'thought-cloud':[53,46,190,109],'comic-burst':[77,62,169,105],
 'up-callout':[42,58,192,110],'cloud-speech':[55,49,186,107],trapezoid:[61,48,177,105],
 'wide-cloud':[56,49,185,116],splash:[82,58,162,103],slanted:[59,43,176,103],
 starburst:[83,61,167,107],round:[55,44,187,102]};
const outlines=new Map();
function outlinePoints(shape){
 if(outlines.has(shape.id))return outlines.get(shape.id);
 const tokens=shape.path.match(/[A-Za-z]|-?\d*\.?\d+/g),points=[];let cursor=[0,0],first=null;
 for(let i=0;i<tokens.length;){
  const command=tokens[i++],pair=()=>[Number(tokens[i++]),Number(tokens[i++])];
  if(command==='M'||command==='L'){cursor=pair();points.push(cursor);first??=cursor;}
  else if(command==='Q'||command==='C'){
   const origin=cursor,a=pair(),b=pair(),end=command==='C'?pair():b;
   for(let step=1;step<=48;step++){const t=step/48,u=1-t;points.push([0,1].map(axis=>command==='C'?u**3*origin[axis]+3*u*u*t*a[axis]+3*u*t*t*b[axis]+t**3*end[axis]:u*u*origin[axis]+2*u*t*a[axis]+t*t*end[axis]));}cursor=end;
  }else if(command==='Z')cursor=first;
  else throw new Error('Unsupported bubble path command: '+command);
 }
 outlines.set(shape.id,points);return points;
}
export function fitCardShape(id,width,textHeight=0){
 const shape=resolveShape(id),[left,top,right,bottom]=regions[shape.id];
 const scale=Math.min(width/240,Math.max(.2,(width-120)/(left+240-right)));
 const centerWidth=width-(left+240-right)*scale,centerHeight=Math.max((bottom-top)*scale,textHeight+16),extraY=centerHeight-(bottom-top)*scale,extraX=centerWidth-(right-left)*scale;
 const mapX=x=>x<=left?x*scale:x>=right?x*scale+extraX:left*scale+(x-left)/(right-left)*centerWidth;
 const mapY=y=>y<=top?y*scale:y>=bottom?y*scale+extraY:top*scale+(y-top)/(bottom-top)*centerHeight;
 // Warp sampled curves, rather than their control points, to retain the border
 // contour when a long center expands across an originally curved segment.
 const path=outlinePoints(shape).map(([x,y],i)=>(i?'L ':'M ')+mapX(x)+' '+mapY(y)).join(' ')+' Z';
 const height=160*scale+extraY,anchors=Object.fromEntries(Object.entries(getShapeAnchors(shape.id)).map(([name,[x,y]])=>[name,[mapX(x*240)/width,mapY(y*160)/height]]));
 return {path,height,anchors,content:{left:mapX(left),top:mapY(top)+8,width:centerWidth,height:centerHeight-16},mapX,mapY};
}
function layoutLegacy(id,contentWidth,textHeight,maxHeight){
 const width=Math.round(Math.max(200,contentWidth*1.45)),natural=Math.max(CARD_LINE_HEIGHT,Math.ceil(textHeight));
 let shown=natural,layout=fitCardShape(id,width,shown);
 for(let i=0;i<3&&layout.height>maxHeight+.5;i++){shown=Math.max(CARD_LINE_HEIGHT*2,shown-(layout.height-maxHeight));layout=fitCardShape(id,width,shown);}
 return {path:layout.path,width,height:layout.height,anchors:layout.anchors,decorations:[],scroll:shown<natural-.5,content:{...layout.content,height:shown}};
}
