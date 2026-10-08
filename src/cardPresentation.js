export const FOLDED_THOUGHT_PATH='M 8 41 C 4 29 9 12 23 7 Q 31 3 38 6 Q 42 19 33 29 Q 23 39 8 41 Z';
export const cardAccentVariant=id=>Array.from(String(id)).reduce((sum,char)=>sum+char.codePointAt(0),0)%3;
export function collapsedCardRect(rect,geometry,target,occupied=[]){
 const width=44,height=48,leftRoom=geometry.paperLeft>=width+16,rightRoom=geometry.width-geometry.paperRight-12>=width+16;
 const preferLeft=rect.x<geometry.paperLeft;
 const x=leftRoom&&(preferLeft||!rightRoom)?geometry.paperLeft-width-12:rightRoom?geometry.paperRight+12:Math.max(8,(geometry.width-width)/2);
 let y=leftRoom||rightRoom?Math.max(8,(target?.y??rect.y)-height/2):geometry.paperBottom+40;

 return {x,y,width,height};
}

export function cardZones(g){const space=Math.max(0,Math.min(g.paperLeft-28,g.width-g.paperRight-28));return [{side:'left',min:g.paperLeft-16-space,max:g.paperLeft-16},{side:'right',min:g.paperRight+16,max:g.paperRight+16+space}];}
export function constrainSideCard(rect,g,side){
 const zones=cardZones(g).filter(zone=>zone.max-zone.min>=rect.width);if(!zones.length)return null;
 const zone=zones.find(zone=>rect.x>=zone.min&&rect.x+rect.width<=zone.max)||zones.find(zone=>zone.side===side)||zones[0];
 return {...rect,x:Math.max(zone.min,Math.min(zone.max-rect.width,rect.x)),y:Math.max(8,rect.y),side:zone.side};
}
export function placeSideCards(cards,g,sizes={}){
 const result={};cards.forEach((card,i)=>{const side=card.side||(card.x>.5?'right':card.x<.5?'left':i%2?'right':'left');const zone=cardZones(g).find(zone=>zone.side===side);const width=Math.min(sizes[card.id]?.width||200,(zone?.max-zone?.min)||0);if(width<120)return;
 const rect={x:card.placement==='free'?(card.x||0)*Math.max(1,g.width-width):side==='left'?zone.max-width:zone.min,y:Math.max(8,card.y||64),width,height:sizes[card.id]?.height||112};const constrained=constrainSideCard(rect,g,side);if(constrained)result[card.id]=constrained;});return result;
}
