import React,{useLayoutEffect,useRef,useState} from 'react';
import {resolveShape} from './bubbleShapes';
import {fitCardShape} from './cardLayout';
export default function CardPreview({card,defaultShape,workspace}){
 const container=useRef(),text=useRef(),[size,setSize]=useState({width:240,textHeight:0});
 useLayoutEffect(()=>{
  const stage=container.current.parentElement,source=workspace.current?.querySelector('[data-card-id="'+card.id+'"]');
  let alive=true;const measure=()=>{if(!alive||!container.current||!text.current)return;const next={width:Math.min(stage.clientWidth,source?.clientWidth||240),textHeight:text.current.offsetHeight};setSize(old=>old.width===next.width&&old.textHeight===next.textHeight?old:next);};
  const observer=new ResizeObserver(measure);observer.observe(stage);observer.observe(text.current);if(source)observer.observe(source);measure();const fonts=document.fonts;fonts?.addEventListener('loadingdone',measure);fonts?.ready.then(measure);
  return()=>{alive=false;observer.disconnect();fonts?.removeEventListener('loadingdone',measure);};
 },[card.id,card.text,card.shape,defaultShape,workspace]);
 const shape=resolveShape(card.shape||defaultShape),layout=fitCardShape(shape.id,size.width,size.textHeight);
 return <div ref={container} className="card-live-preview" data-shape={shape.id} style={{width:size.width,height:layout.height,color:card.fg,'--cloud-fill':card.bg,'--cloud-opacity':card.opacity}} aria-label="Live thought card preview"><svg className="cloud-shape" viewBox={`0 0 ${size.width} ${layout.height}`} preserveAspectRatio="none" aria-hidden="true"><path d={layout.path}/>{shape.dots&&<><circle cx={layout.mapX(224)} cy={layout.mapY(134)} r={layout.mapX(7)}/><circle cx={layout.mapX(237)} cy={layout.mapY(151)} r={layout.mapX(4)}/></>}</svg><div ref={text} className="cloud-text" style={{position:'absolute',left:layout.content.left,top:layout.content.top,width:layout.content.width,opacity:card.opacity}}>{card.text||'An unfinished thought…'}</div></div>;
}
