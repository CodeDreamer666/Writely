import React from 'react';
import {selectableBubbleShapes,resolveShape} from './bubbleShapes';
import {layoutCard} from './cardLayout';
// Thumbnails come from the same generator as the cards, so each choice shows the real silhouette.
const thumbnails=Object.fromEntries(selectableBubbleShapes.map(shape=>[shape.id,layoutCard(shape.id,{contentWidth:150,textHeight:68})]));
export default function BubbleShapePicker({value,onChange,label,allowDefault=false,defaultShape='rectangle'}){
 return <fieldset className="bubble-shape-picker"><legend>{label}</legend>{allowDefault&&<button type="button" className="shape-default" aria-pressed={!value} onClick={()=>onChange(null)}>Use default · {resolveShape(defaultShape).name}</button>}<div>{selectableBubbleShapes.map(shape=>{const thumb=thumbnails[shape.id];return <button key={shape.id} type="button" aria-label={`${label}: ${shape.name}`} title={shape.name} aria-pressed={value===shape.id} onClick={()=>onChange(shape.id)}><svg viewBox={`-2 -2 ${thumb.width+4} ${thumb.height+4}`} aria-hidden="true"><path d={thumb.path}/>{thumb.decorations.map((dot,i)=><circle key={i} cx={dot.cx} cy={dot.cy} r={dot.r}/>)}</svg><span>{shape.name}</span></button>;})}</div></fieldset>;
}
