import React,{useState,useEffect,useLayoutEffect,useRef,useMemo} from 'react';
import {Settings2,X,Link2,ChevronDown} from 'lucide-react';
import {targetAtPosition,cardArrowAnchor,cardArrowPoint,connectorPath,clamp} from './annotationModel';
import './annotations.css';
import {documentWords,measureWordLines} from './wordConnections';
import {resolveShape} from './bubbleShapes';
import {layoutCard,cardContentWidth,CARD_MAX_WIDTH,CARD_MIN_ROOM} from './cardLayout';
import {textConnectionPoint} from './textConnectionPoint';
import {setCardHighlights} from './cardHighlights';
import {FOLDED_THOUGHT_PATH,cardAccentVariant,collapsedCardRect,placeSideCards,constrainSideCard,constrainFreeCard,expandedPosition,cardMaxWidth} from './cardPresentation';
// The silhouette is drawn at the card's real size, so curves and lobes are never stretched.
export function CardShape({layout}){
 return <svg className="cloud-shape" width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true" focusable="false"><path d={layout.path}/>{layout.decorations.map((dot,i)=><circle key={i} cx={dot.cx} cy={dot.cy} r={dot.r}/>)}</svg>;
}
// Text sits in the shape's safe column; past the maximum card size it scrolls inside it.
// The collapse and customize buttons occupy the card's top-right corner (see .cloud-collapse/.cloud-edit).
const CONTROLS_WIDTH=70,CONTROLS_HEIGHT=34;
export const CardText=React.forwardRef(function CardText({layout,children,style},ref){
 const {left,top,width,height}=layout.content,room=layout.reserveControls&&top<CONTROLS_HEIGHT?Math.max(0,left+width-(layout.width-CONTROLS_WIDTH)):0;
 return <div ref={ref} className="cloud-text" data-scroll={layout.scroll||undefined} style={{position:'absolute',left,top,width,height:layout.scroll?height:undefined,...style}}>{room>0&&<span className="cloud-text-controls-room" style={{width:room,height:CONTROLS_HEIGHT-top}} aria-hidden="true"/>}{children}</div>;
});
export default function Annotations({editor,workspace,cards,defaultShape,selected,onSelect,onPatch,onEdit,onConnectStart}){
 const [geometry,setGeometry]=useState(null),[textHeights,setTextHeights]=useState({}),[revision,setRevision]=useState(0),[linking,setLinking]=useState(null),[mode,setMode]=useState('selection'),[dragging,setDragging]=useState(null);
 const nodes=useRef(new Map()),selection=useRef(null),gesture=useRef(null),frame=useRef(0),linkingRef=useRef(null),positionsRef=useRef({}),geometryRef=useRef(null);
 const [hoveredCard,setHoveredCard]=useState(null);
 useEffect(()=>{setCardHighlights(editor,cards,selected,hoveredCard);},[editor,cards,selected,hoveredCard]);
 useEffect(()=>()=>setCardHighlights(editor),[editor]);
 const lastDrag=useRef(null);
 const wordGeometry=useRef(new Map()),wordDocument=useRef(null),words=useRef([]);
 const connectorColor=card=>`color-mix(in srgb, ${card.bg} 78%, ${card.fg||'#1F1D1A'} 22%)`;
 linkingRef.current=linking;
 const measure=()=>{
  const w=workspace.current,paper=w?.querySelector('.paper');if(!w||!paper||!editor||editor.isDestroyed)return;
  const wr=w.getBoundingClientRect(),pr=paper.getBoundingClientRect(),sx=wr.width/w.offsetWidth||1,sy=wr.height/w.offsetHeight||1;
  const next={width:w.clientWidth,paperLeft:(pr.left-wr.left)/sx+w.scrollLeft,paperRight:(pr.right-wr.left)/sx+w.scrollLeft,paperBottom:(pr.bottom-wr.top)/sy+w.scrollTop,viewportHeight:w.clientHeight,scrollTop:w.scrollTop};
  setGeometry(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);
  // Text is measured at its laid-out column width; scrollHeight keeps the full height once a card scrolls.
  const measured={};nodes.current.forEach((el,id)=>{if(el.dataset.collapsed==='true')return;const text=el.querySelector('.cloud-text');if(text)measured[id]=text.scrollHeight;});
  if(editor){if(wordDocument.current!==editor.state.doc){wordDocument.current=editor.state.doc;words.current=documentWords(editor.state.doc);}wordGeometry.current=measureWordLines(editor.view,w,words.current);}
  setTextHeights(old=>{const next={...old,...measured};return JSON.stringify(old)===JSON.stringify(next)?old:next;});setRevision(n=>n+1);
 };
 useLayoutEffect(()=>{measure();},[cards,selected,!!geometry]);
 useEffect(()=>{
  if(!editor||editor.isDestroyed||!workspace.current)return;
  const w=workspace.current,app=w.closest('.app');let alive=true;
  const schedule=()=>{cancelAnimationFrame(frame.current);frame.current=requestAnimationFrame(()=>{if(alive)measure();});};
  const animate=()=>{const until=performance.now()+240;const tick=()=>{if(!alive)return;measure();if(performance.now()<until)frame.current=requestAnimationFrame(tick);};cancelAnimationFrame(frame.current);frame.current=requestAnimationFrame(tick);};
  const paperTransition=e=>{if(e.target.matches('.paper')){if(e.type==='transitionrun')animate();else schedule();}};
  w.addEventListener('transitionrun',paperTransition);w.addEventListener('transitionend',paperTransition);w.addEventListener('transitioncancel',paperTransition);
  const observe=new ResizeObserver(schedule);observe.observe(w);observe.observe(editor.view.dom);
  nodes.current.forEach(el=>{observe.observe(el);const text=el.querySelector('.cloud-text');if(text)observe.observe(text);});
  const mutations=new MutationObserver(animate);mutations.observe(app,{attributes:true,attributeFilter:['class']});
  const textMutations=new MutationObserver(schedule);textMutations.observe(editor.view.dom,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style']});
  const fonts=editor.view.dom.ownerDocument.fonts;fonts?.addEventListener('loadingdone',schedule);fonts?.ready.then(()=>{if(alive)schedule();});
  window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
  const remember=()=>{const s=editor.state.selection;if(s.to>s.from)selection.current={from:s.from,to:s.to,quote:editor.state.doc.textBetween(s.from,s.to,' ')};schedule();};
  const transaction=({transaction})=>{if(transaction.docChanged&&selection.current){const s=selection.current,from=transaction.mapping.map(s.from,1),to=transaction.mapping.map(s.to,-1);selection.current=to>from?{from,to,quote:transaction.doc.textBetween(from,to,' ')}:null;}remember();};
  const escape=e=>{if(e.key==='Escape'){setLinking(null);setDragging(null);gesture.current=null;}};
  editor.on('selectionUpdate',remember);editor.on('transaction',transaction);w.addEventListener('scroll',schedule,{passive:true});window.addEventListener('keydown',escape);window.addEventListener('resize',schedule);schedule();
  return()=>{alive=false;cancelAnimationFrame(frame.current);observe.disconnect();mutations.disconnect();textMutations.disconnect();w.removeEventListener('transitionrun',paperTransition);w.removeEventListener('transitionend',paperTransition);w.removeEventListener('transitioncancel',paperTransition);fonts?.removeEventListener('loadingdone',schedule);window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);editor.off('selectionUpdate',remember);editor.off('transaction',transaction);w.removeEventListener('scroll',schedule);window.removeEventListener('keydown',escape);window.removeEventListener('resize',schedule);gesture.current=null;};
 },[editor,cards.length,cards.map(card=>card.collapsed?card.id:'').join('|'),!!geometry]);
 const maxWidth=geometry?Math.min(CARD_MAX_WIDTH,cardMaxWidth(geometry)):CARD_MAX_WIDTH;
 // Each card's silhouette follows from its shape and text, not from where it sits.
 const layouts=useMemo(()=>Object.fromEntries(cards.map(card=>{const shape=card.shape||defaultShape;return [card.id,layoutCard(shape,{contentWidth:cardContentWidth(shape,card.text,maxWidth),textHeight:textHeights[card.id]})];})),[cards,defaultShape,maxWidth,textHeights]);
 const positions=useMemo(()=>geometry?placeSideCards(cards,geometry,layouts,CARD_MIN_ROOM):{},[cards,geometry,layouts]);
 positionsRef.current=positions;geometryRef.current=geometry;
 const getTargetPoint=(target,start)=>editor&&!editor.isDestroyed&&workspace.current?textConnectionPoint(editor.view,workspace.current,target,start.x<(geometry.paperLeft+geometry.paperRight)/2?'left':'right'):null;
 const attach=(target)=>{
  const current=linkingRef.current;if(!current||!target)return;
  const card=cards.find(c=>c.id===current.cardId);if(!card)return;
  const link={id:crypto.randomUUID(),anchor:cardArrowAnchor(positionsRef.current[card.id]),target};
  onPatch(card.id,{connectors:[...(card.connectors||[]),link]});setLinking(null);
 };
 const captureSelection=()=>{
  const domSelection=window.getSelection();if(!domSelection?.rangeCount||domSelection.isCollapsed)return;
  const range=domSelection.getRangeAt(0);if(!editor.view.dom.contains(range.startContainer)||!editor.view.dom.contains(range.endContainer))return;
  try{const from=editor.view.posAtDOM(range.startContainer,range.startOffset),to=editor.view.posAtDOM(range.endContainer,range.endOffset);if(to>from)selection.current={from,to,quote:editor.state.doc.textBetween(from,to,' ')};}catch{}
 };
 const startLink=(e,c)=>{
  const anchor=cardArrowAnchor(positionsRef.current[c.id]);
  if(e.button!==0)return;captureSelection();e.stopPropagation();e.preventDefault();onSelect(c.id);onConnectStart?.();
  const current={cardId:c.id,anchor};setLinking(current);linkingRef.current=current;
  gesture.current={type:'link',cardId:c.id,anchor,startX:e.clientX,startY:e.clientY,moved:false};e.currentTarget.setPointerCapture(e.pointerId);
 };
 // Leaves stay within their margin; expanded cards move freely, over the page if placed there.
 const moveCard=(g,rect)=>g.collapsed?constrainSideCard(rect,geometryRef.current,g.rect.side):constrainFreeCard(rect,geometryRef.current);
 // Leaf and expanded positions are saved separately so each form returns to its own place.
 const savedPosition=(collapsed,rect,g)=>collapsed?{leafPosition:{side:rect.side,x:rect.x/Math.max(1,g.width-rect.width),y:rect.y}}:expandedPosition(rect,g);
 const startDrag=(e,c)=>{
  if(e.button!==0||!c.collapsed&&e.target.closest('button'))return;
  // Leave a scrolling thought's scrollbar to scroll rather than drag.
  if(e.target.matches?.('.cloud-text')&&e.offsetX>e.target.clientWidth)return;lastDrag.current=null;e.preventDefault();onSelect(c.id);setLinking(null);
  const rect=positionsRef.current[c.id];if(!rect)return;
  gesture.current={type:'card',cardId:c.id,collapsed:!!c.collapsed,rect,startX:e.clientX,startY:e.clientY,moved:false};e.currentTarget.setPointerCapture(e.pointerId);
 };
 const pointerMove=e=>{
  const g=gesture.current,w=workspace.current;if(!g||!w)return;
  const dx=e.clientX-g.startX,dy=e.clientY-g.startY;if(Math.hypot(dx,dy)<4&&!g.moved)return;g.moved=true;
  if(g.type==='card'){const next=moveCard(g,{...g.rect,x:g.rect.x+dx,y:g.rect.y+dy});if(next)setDragging({cardId:g.cardId,...next});}
  else{const wr=w.getBoundingClientRect();setLinking({...linkingRef.current,pointer:{x:e.clientX-wr.left,y:e.clientY-wr.top+w.scrollTop}});}
 };
 const pointerEnd=e=>{
  const g=gesture.current,w=workspace.current;gesture.current=null;if(!g||!w)return;
  if(g.type==='card'&&g.moved){
   const rect=moveCard(g,{...g.rect,x:g.rect.x+e.clientX-g.startX,y:g.rect.y+e.clientY-g.startY});
   if(rect){onPatch(g.cardId,savedPosition(g.collapsed,rect,geometryRef.current));lastDrag.current={id:g.cardId,time:performance.now()};}setDragging(null);
  }else if(g.type==='link'&&g.moved){
   const hit=editor.view.posAtCoords({left:e.clientX,top:e.clientY});
   if(hit&&editor.view.dom.getBoundingClientRect().left<=e.clientX&&e.clientX<=editor.view.dom.getBoundingClientRect().right){const s=selection.current;const relevant=s&&hit.pos>=s.from&&hit.pos<=s.to?s:null;attach(targetAtPosition(editor.state.doc,hit.pos,mode,relevant));}else setLinking({...linkingRef.current,pointer:null});
  }
 };
 const keyboardMove=(e,c)=>{
  if(e.target!==e.currentTarget)return;
  if(e.key==='Enter'){e.preventDefault();onEdit(c.id);return;}
  const dirs={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,-8],ArrowDown:[0,8]};if(!dirs[e.key])return;
  e.preventDefault();const r=positionsRef.current[c.id],[dx,dy]=dirs[e.key];const next=moveCard({collapsed:!!c.collapsed,rect:r},{...r,x:r.x+dx,y:r.y+dy});if(next)onPatch(c.id,savedPosition(c.collapsed,next,geometry));
 };
 if(!geometry)return <div className="annotation-layer" aria-label="Writing annotations"/>;
 const actual={...positions};for(const card of cards.filter(card=>card.collapsed)){const rect=actual[card.id];if(!rect)continue;const target=(card.connectors||[]).map(link=>getTargetPoint(link.target,{x:rect.x,y:rect.y})).find(Boolean);const markerRect=collapsedCardRect(rect,geometry,target);const saved=card.leafPosition;actual[card.id]=constrainSideCard({...markerRect,x:saved?saved.x*Math.max(1,geometry.width-markerRect.width):markerRect.x,y:saved?saved.y:card.placement==='free'?rect.y:markerRect.y},geometry,saved?.side||rect.side);}
 if(dragging&&actual[dragging.cardId])actual[dragging.cardId]={...actual[dragging.cardId],x:dragging.x,y:dragging.y,side:dragging.side};positionsRef.current=actual;
 const height=Math.max(geometry.paperBottom+32,...Object.values(actual).map(r=>r.y+r.height+40));
 const connectionPoints=(card,rect)=>card.collapsed?{left:[.18,.5],right:[.81,.5]}:layouts[card.id].anchors;
 const arrows=cards.flatMap(c=>(c.connectors||[]).map(link=>{const rect=actual[c.id];if(!rect)return null;const start=cardArrowPoint(rect,connectionPoints(c,rect)),end=getTargetPoint(link.target,start);return end?{id:link.id,cardId:c.id,path:connectorPath(start,end,cardArrowAnchor(rect)),end,color:connectorColor(c),active:(selected||hoveredCard)===c.id}:null;})).filter(Boolean);
 const pending=linking&&actual[linking.cardId]&&layouts[linking.cardId]?cardArrowPoint(actual[linking.cardId],layouts[linking.cardId].anchors):null;
 return <div className={`annotation-layer ${linking?'is-connecting':''}`} aria-label="Writing annotations" style={{height}}>
  <svg className="word-connection-geometry" width={geometry.width} height={height} aria-hidden="true" focusable="false" style={{position:'absolute',top:0,left:0,visibility:'hidden',pointerEvents:'none'}}>{[...wordGeometry.current.values()].map(word=><g key={word.from+':'+word.to} data-word-from={word.from} data-word-to={word.to}><line x1={word.x1} x2={word.x2} y1={word.y} y2={word.y}/><circle cx={word.point.x} cy={word.point.y} r="0"/></g>)}</svg>
  <svg className="annotation-connectors" width={geometry.width} height={height} aria-hidden="true">{arrows.map(a=><g key={a.id} className={a.active?'connector-active':''} style={{color:a.color}}><path d={a.path}/><circle cx={a.end.x} cy={a.end.y} r="2.5"/></g>)}{pending&&linking.pointer&&<path className="connector-preview" d={connectorPath(pending,linking.pointer,cardArrowAnchor(actual[linking.cardId]))} style={{color:connectorColor(cards.find(card=>card.id===linking.cardId))}}/>}</svg>
  {cards.map((c,i)=>{const r=actual[c.id];if(!r)return null;if(c.collapsed)return <button key={c.id} ref={el=>el?nodes.current.set(c.id,el):nodes.current.delete(c.id)} className={`thought-paper-marker ${dragging?.cardId===c.id?'is-dragging':''}`} data-card-id={c.id} data-collapsed="true" style={{left:r.x,top:r.y,width:r.width,height:r.height,'--cloud-fill':c.bg,'--cloud-opacity':c.opacity}} aria-label={`Expand thought ${i+1}`} onPointerEnter={()=>setHoveredCard(c.id)} onPointerLeave={()=>setHoveredCard(null)} onPointerDown={e=>startDrag(e,c)} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={()=>{gesture.current=null;setDragging(null);}} onKeyDown={e=>{if(e.key.startsWith('Arrow'))keyboardMove(e,c);}} onClick={()=>{if(lastDrag.current?.id===c.id&&performance.now()-lastDrag.current.time<300)return;onPatch(c.id,{collapsed:false});onSelect(c.id);}}><svg viewBox="0 0 44 48" aria-hidden="true" focusable="false"><path d={FOLDED_THOUGHT_PATH} fill={c.bg}/><path d="M 29 5 Q 28 13 39 14 L 38 6 Z" fill="white" opacity=".3"/><path d="M 29 6 Q 29 13 39 14 M 9 40 L 29 17 M 17 31 L 17 23 M 22 26 L 30 26" fill="none" stroke={c.fg} strokeWidth=".8" opacity=".13"/></svg></button>;const shape=resolveShape(c.shape||defaultShape),layout=layouts[c.id],point=layout.anchors[cardArrowAnchor(r)];return <div key={c.id} ref={el=>el?nodes.current.set(c.id,el):nodes.current.delete(c.id)} data-card-id={c.id} onPointerEnter={()=>setHoveredCard(c.id)} onPointerLeave={()=>setHoveredCard(null)} data-shape={shape.id} data-max-width={maxWidth} className={`annotation-cloud ${selected===c.id?'is-selected':''} ${dragging?.cardId===c.id?'is-dragging':''}`} style={{left:r.x,top:r.y,width:layout.width,height:layout.height,color:c.fg,'--cloud-fill':c.bg,'--cloud-opacity':c.opacity,'--card-ink':c.bg}} role="group" aria-label={`Thought ${i+1}`}>
   <CardShape layout={layout}/>
   <div className="cloud-body" style={{padding:0}} role="button" tabIndex={0} aria-label={`Thought ${i+1}: ${c.text||'An unfinished thought'}. Drag to move, Enter to edit.`} onPointerDown={e=>startDrag(e,c)} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={()=>{gesture.current=null;setDragging(null);}} onKeyDown={e=>keyboardMove(e,c)} onDoubleClick={()=>onEdit(c.id)}><CardText layout={layout}>{c.text||'An unfinished thought…'}</CardText></div>
   {cardAccentVariant(c.id)!==0&&<svg className="card-handdrawn-accents" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true" focusable="false">{cardAccentVariant(c.id)===1?<path d={`M -8 24 l -5 -4 M -7 33 l -7 1 M ${layout.width-30} -4 q 6 -7 13 -5`}/>:<path d={`M -7 ${layout.height*.4} q -7 5 -3 13 M ${layout.width-20} -5 l 3 -6 M ${layout.width-11} -3 l 6 -4`}/>}</svg>}
   <button className="cloud-collapse" aria-label={`Collapse thought ${i+1}`} onClick={()=>{onPatch(c.id,{collapsed:true});onSelect(null);setLinking(null);gesture.current=null;}}><ChevronDown size={13}/></button>
   <button className="cloud-edit" aria-label={`Customize thought ${i+1}`} onClick={()=>onEdit(c.id)}><Settings2 size={13}/></button>
   <button className="cloud-anchor" style={{background:connectorColor(c),borderColor:connectorColor(c),left:`${point[0]*100}%`,top:`${point[1]*100}%`,transform:'translate(-50%,-50%)'}} aria-label={`Connect thought ${i+1} to writing`} onPointerDown={e=>startLink(e,c)} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={()=>{gesture.current=null;setLinking(null);}} onClick={e=>{if(e.detail===0){captureSelection();const current={cardId:c.id,anchor:cardArrowAnchor(r)};onSelect(c.id);onConnectStart?.();setLinking(current);linkingRef.current=current;}}}/>
  </div>;})}
  {linking&&<div className="annotation-link-toolbar" role="toolbar" aria-label="Connect thought to writing"><span><Link2 size={14}/> Connect thought</span><select aria-label="Connector target" value={mode} onChange={e=>setMode(e.target.value)}><option value="selection">Selection or word</option><option value="sentence">Sentence</option><option value="paragraph">Paragraph</option><option value="essay">Whole essay</option></select><button disabled={!selection.current} onClick={()=>attach(targetAtPosition(editor.state.doc,selection.current?.from||editor.state.selection.from,'selection',selection.current))}>Link selection</button><button onClick={()=>attach(targetAtPosition(editor.state.doc,editor.state.selection.from,mode==='selection'?'paragraph':mode))}>{mode==='essay'?'Link essay':'Link at cursor'}</button><button className="icon-button" aria-label="Cancel connector" onClick={()=>setLinking(null)}><X size={16}/></button><small>Drag the arrow point to text, or select text and link it. Esc cancels.</small></div>}
 </div>;
}
