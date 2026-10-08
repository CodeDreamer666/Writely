import {resolveShape,getShapeAnchors} from './bubbleShapes.js';
// Safe content rectangles in the original 240 × 160 drawings. The outline's
// top/bottom borders retain their size while the center grows with the text.
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
