import {Extension} from '@tiptap/core';
import {Plugin,PluginKey} from '@tiptap/pm/state';
import {Decoration,DecorationSet} from '@tiptap/pm/view';
export const cardHighlightKey=new PluginKey('cardTextHighlights');
export function highlightRanges(cards,selected,hovered,docSize){
 const links=cards.flatMap(card=>(card.connectors||[]).flatMap(link=>{
  const target=link.target;if(!target||target.orphaned)return [];
  const from=target.kind==='essay'?0:target.from,to=target.kind==='essay'?docSize:target.to;
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to>docSize||from>=to)return [];
  return [{from,to,cardId:card.id,color:/^#[0-9a-f]{6}$/i.test(card.bg)?card.bg:'#DDEBDD'}];
 }));
 const points=[...new Set(links.flatMap(link=>[link.from,link.to]))].sort((a,b)=>a-b),result=[];
 for(let i=0;i<points.length-1;i++){
  const from=points[i],to=points[i+1],covering=[...new Map(links.filter(link=>link.from<=from&&link.to>=to).map(link=>[link.cardId,link])).values()];if(!covering.length)continue;
  const cardIds=covering.map(link=>link.cardId).sort(),chosen=covering.find(link=>link.cardId===selected)||covering.find(link=>link.cardId===hovered);
  const state=chosen?(chosen.cardId===selected?'selected':'hovered'):'default',owner=chosen||covering[0],shared=cardIds.length>1;
  const range={from,to,cardId:owner.cardId,cardIds,color:!chosen&&shared?'#C8C5BE':owner.color,state,opacity:state==='selected'?52:state==='hovered'?42:shared?28:32};
  const last=result.at(-1);if(last&&last.to===from&&last.color===range.color&&last.state===state&&JSON.stringify(last.cardIds)===JSON.stringify(cardIds))last.to=to;else result.push(range);
 }
 return result;
}
export const CardHighlights=Extension.create({name:'cardHighlights',addProseMirrorPlugins(){return [new Plugin({key:cardHighlightKey,state:{
 init:()=>DecorationSet.empty,
 apply(transaction,previous){const ranges=transaction.getMeta(cardHighlightKey);if(ranges===undefined)return previous.map(transaction.mapping,transaction.doc);
 return DecorationSet.create(transaction.doc,ranges.map(range=>Decoration.inline(range.from,range.to,{class:'card-text-highlight','data-annotation-card':range.cardId,'data-highlight-state':range.state,'data-connected-count':String(range.cardIds.length),'data-annotation-cards':JSON.stringify(range.cardIds),style:'background-color:color-mix(in srgb, '+range.color+' '+range.opacity+'%, transparent);border-radius:2px;box-decoration-break:clone;-webkit-box-decoration-break:clone;'})));}
 },props:{decorations:state=>cardHighlightKey.getState(state)},view(view){
  let indicator=null;
  const hide=()=>{indicator?.remove();indicator=null;};
  const over=e=>{const el=e.target.closest?.('.card-text-highlight');const count=Number(el?.dataset.connectedCount);if(count<2||!el){hide();return;}hide();indicator=view.dom.ownerDocument.createElement('span');indicator.className='shared-thought-indicator';indicator.setAttribute('role','tooltip');indicator.textContent=count+' thoughts';const r=el.getBoundingClientRect();indicator.style.left=Math.max(8,Math.min(innerWidth-100,r.left))+'px';indicator.style.top=Math.max(8,r.top-28)+'px';view.dom.ownerDocument.body.appendChild(indicator);};
  const out=e=>{if(!e.relatedTarget||!view.dom.contains(e.relatedTarget)||e.target.closest?.('.card-text-highlight')!==e.relatedTarget.closest?.('.card-text-highlight'))hide();};
  view.dom.addEventListener('mouseover',over);view.dom.addEventListener('mouseout',out);view.dom.ownerDocument.addEventListener('scroll',hide,true);
  return {update:hide,destroy(){hide();view.dom.removeEventListener('mouseover',over);view.dom.removeEventListener('mouseout',out);view.dom.ownerDocument.removeEventListener('scroll',hide,true);}};
 }})];}});
export function setCardHighlights(editor,cards=[],selected=null,hovered=null){
 if(editor&&!editor.isDestroyed)editor.view.dispatch(editor.state.tr.setMeta(cardHighlightKey,highlightRanges(cards,selected,hovered,editor.state.doc.content.size)).setMeta('addToHistory',false));
}
