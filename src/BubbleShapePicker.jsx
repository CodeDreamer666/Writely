import React from 'react';
import {selectableBubbleShapes,resolveShape} from './bubbleShapes';
export default function BubbleShapePicker({value,onChange,label,allowDefault=false,defaultShape='rectangle'}){
 return <fieldset className="bubble-shape-picker"><legend>{label}</legend>{allowDefault&&<button type="button" className="shape-default" aria-pressed={!value} onClick={()=>onChange(null)}>Use default · {resolveShape(defaultShape).name}</button>}<div>{selectableBubbleShapes.map(shape=><button key={shape.id} type="button" aria-label={`${label}: ${shape.name}`} title={shape.name} aria-pressed={value===shape.id} onClick={()=>onChange(shape.id)}><svg viewBox="0 0 240 160" aria-hidden="true"><path d={shape.path}/>{shape.dots&&<><circle cx="224" cy="134" r="7"/><circle cx="237" cy="151" r="4"/></>}</svg><span>{shape.name}</span></button>)}</div></fieldset>;
}
