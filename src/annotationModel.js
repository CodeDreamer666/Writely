import {documentWords,wordAtRange} from './wordConnections.js';
export const CARD_GAP = 24;
export const CARD_ARROW_ANCHOR = 'right';
export const cardArrowAnchor = rect => rect?.side==='right'?'left':'right';
export const cardArrowPoint = (rect,points) => anchorPoint(rect,cardArrowAnchor(rect),points);
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const overlaps = (a,b) => a.x < b.x+b.width+CARD_GAP && a.x+a.width+CARD_GAP > b.x && a.y < b.y+b.height+CARD_GAP && a.y+a.height+CARD_GAP > b.y;
export function placeAnnotations(cards, geometry, sizes={}) {
 const {width,paperLeft,paperRight,paperBottom}=geometry;
 const leftSpace=paperLeft-32,rightSpace=width-paperRight-104;
 const margins=Math.max(leftSpace,rightSpace)>=176;
 const placed=[], result={};
 for(const c of cards.filter(c=>c.placement==='free')){
  const size=sizes[c.id]||{};const w=Math.min(size.width||176,Math.max(120,width-32)),h=size.height||112;
  const r={x:clamp((Number.isFinite(c.x)?c.x:0)*Math.max(1,width-w),8,Math.max(8,width-w-8)),y:Math.max(8,c.y||8),width:w,height:h};
  result[c.id]=r;placed.push(r);
 }
 let shelfY=paperBottom+40;
 for(const [i,c] of cards.entries()){
  if(result[c.id])continue;
  let side=c.side||(c.x>.5?'right':c.x<.5?'left':i%2?'right':'left');
  if(side==='left'&&leftSpace<176)side='right';if(side==='right'&&rightSpace<176)side='left';
  const space=side==='left'?leftSpace:rightSpace;
  const w=margins?clamp(space,176,200):Math.min(260,width-40),h=sizes[c.id]?.height||112;
  const x=margins?(side==='left'?Math.max(12,paperLeft-w-20):paperRight+20):(width-w)/2;
  let y=margins?Math.max(64,c.y||64):shelfY;
  const r={x,y,width:w,height:h};
  let collision;
  while((collision=placed.find(other=>overlaps(r,other))))r.y=collision.y+collision.height+CARD_GAP;
  result[c.id]=r;placed.push(r);if(!margins)shelfY=r.y+h+CARD_GAP;
 }
 return result;
}
export function settleCard(rect, others) {
 const result={...rect};let collision;
 while((collision=others.find(other=>overlaps(result,other))))result.y=collision.y+collision.height+CARD_GAP;
 return result;
}
export function targetAtPosition(doc, position, mode='selection', selection=null) {
 if(mode==='essay')return {kind:'essay',quote:'Whole essay'};
 if(mode==='selection'&&selection&&selection.to>selection.from&&selection.to<=doc.content.size&&doc.textBetween(selection.from,selection.to,' ')===selection.quote){
  return wordAtRange(documentWords(doc),selection.from,selection.to)||{kind:'text',from:selection.from,to:selection.to,quote:selection.quote};
 }
 const pos=clamp(position,0,doc.content.size),resolved=doc.resolve(pos);
 if(mode==='selection'||mode==='word')return documentWords(doc).find(word=>pos>=word.from&&pos<word.to)||null;
 if(!resolved.parent.isTextblock)return null;
 const start=resolved.start(),text=resolved.parent.textContent;
 if(!text.trim())return null;
 if(mode==='paragraph')return {kind:'paragraph',from:start,to:start+resolved.parent.content.size,quote:text};
 const granularity=mode==='sentence'?'sentence':'word';
 const parts=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity}).segment(text)]:[...text.matchAll(granularity==='word'?/\S+/g:/[^.!?]+[.!?]*/g)].map(m=>({segment:m[0],index:m.index}));
 const offset=clamp(resolved.parentOffset,0,Math.max(0,text.length-1));
 const part=parts.find(p=>offset>=p.index&&offset<p.index+p.segment.length&&/[\p{L}\p{N}]/u.test(p.segment));
 if(!part)return null;
 // Segmenter uses text offsets; translate through inline nodes to ProseMirror positions.
 const positionFor=offset=>{let consumed=0,found=start;resolved.parent.forEach((node,nodeOffset)=>{if(consumed<=offset){if(node.isText){if(offset<=consumed+node.text.length)found=start+nodeOffset+offset-consumed;}else if(offset===consumed)found=start+nodeOffset;}consumed+=node.textContent.length;});return found;};
 const from=positionFor(part.index),to=positionFor(part.index+part.segment.trimEnd().length);
 return to>from?{kind:'text',from,to,quote:doc.textBetween(from,to,' ')}:null;
}
export function remapConnectors(cards, mapping, doc) {
 const words=documentWords(doc);
 return cards.map(card=>{
  if(!card.connectors?.length)return card;
  return {...card,connectors:card.connectors.map(link=>{
   const t=link.target;if(!t||t.kind==='essay'||t.orphaned)return link;
   const from=mapping.mapResult(t.from,1),to=mapping.mapResult(t.to,-1);
   if(from.pos>=to.pos||from.deletedAcross&&to.deletedAcross||to.pos>doc.content.size)return {...link,target:{...t,orphaned:true}};
   if(t.kind==='word'){
    const word=words.find(word=>word.from<to.pos&&word.to>from.pos);
    return {...link,target:word?{...t,...word,orphaned:false}:{...t,orphaned:true}};
   }
   const quote=doc.textBetween(from.pos,to.pos,' ');
   return {...link,target:{...t,from:from.pos,to:to.pos,quote,orphaned:!quote.trim()}};
  })};
 });
}
export function anchorPoint(rect,anchor,points){
 if(points?.[anchor])return {x:rect.x+rect.width*points[anchor][0],y:rect.y+rect.height*points[anchor][1]};
 return anchor==='left'?{x:rect.x,y:rect.y+rect.height/2}:anchor==='right'?{x:rect.x+rect.width,y:rect.y+rect.height/2}:anchor==='top'?{x:rect.x+rect.width/2,y:rect.y}:{x:rect.x+rect.width/2,y:rect.y+rect.height};
}
export function connectorPath(start,end,anchor){
 const bend=Math.max(28,Math.min(100,Math.abs(end.x-start.x)*.45));
 const control=anchor==='left'?{x:start.x-bend,y:start.y}:anchor==='right'?{x:start.x+bend,y:start.y}:anchor==='top'?{x:start.x,y:start.y-bend}:{x:start.x,y:start.y+bend};
 const arrival={x:end.x+(end.x>start.x?-20:20),y:end.y};
 return `M ${start.x} ${start.y} C ${control.x} ${control.y}, ${arrival.x} ${arrival.y}, ${end.x} ${end.y}`;
}
