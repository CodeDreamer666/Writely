import React,{useLayoutEffect,useRef,useState} from 'react';
import {resolveShape} from './bubbleShapes';
import {layoutCard,cardContentWidth,CARD_MAX_WIDTH} from './cardLayout';
import {CardShape,CardText} from './Annotations';
// Renders the card exactly as the workspace does (same width limit, wrapping and
// scrolling), scaled down only when the preview column is narrower than the card.
export default function CardPreview({card,defaultShape,workspace}){
 const stage=useRef(),text=useRef(),[size,setSize]=useState({stageWidth:0,textHeight:0,maxWidth:CARD_MAX_WIDTH});
 const shape=resolveShape(card.shape||defaultShape),layout=layoutCard(shape.id,{contentWidth:cardContentWidth(shape.id,card.text,size.maxWidth),textHeight:size.textHeight});
 useLayoutEffect(()=>{
  const container=stage.current.parentElement;let alive=true;
  const measure=()=>{if(!alive||!text.current)return;const source=workspace.current?.querySelector('.annotation-cloud[data-max-width]');const next={stageWidth:container.clientWidth,textHeight:text.current.scrollHeight,maxWidth:Number(source?.dataset.maxWidth)||CARD_MAX_WIDTH};setSize(old=>old.stageWidth===next.stageWidth&&old.textHeight===next.textHeight&&old.maxWidth===next.maxWidth?old:next);};
  const observer=new ResizeObserver(measure);observer.observe(container);observer.observe(text.current);measure();const fonts=document.fonts;fonts?.addEventListener('loadingdone',measure);fonts?.ready.then(measure);
  return()=>{alive=false;observer.disconnect();fonts?.removeEventListener('loadingdone',measure);};
 },[card.id,card.text,shape.id,workspace,layout.content.width]);
 const scale=size.stageWidth?Math.min(1,size.stageWidth/layout.width):1;
 return <div ref={stage} className="card-live-preview-frame" style={{width:layout.width*scale,height:layout.height*scale}}><div className="card-live-preview" data-shape={shape.id} data-scroll={layout.scroll||undefined} style={{width:layout.width,height:layout.height,transform:scale<1?`scale(${scale})`:undefined,color:card.fg,'--cloud-fill':card.bg,'--cloud-opacity':card.opacity}} aria-label="Live thought card preview"><CardShape layout={layout}/><CardText ref={text} layout={layout} style={{opacity:card.opacity}}>{card.text||'An unfinished thought…'}</CardText></div></div>;
}
