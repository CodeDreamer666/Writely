// Logical word ranges remain in document coordinates, never screen coordinates.
const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'word'}):null;
export function documentWords(doc){
 const words=[];
 doc.descendants((block,pos)=>{
  if(!block.isTextblock)return;
  let text='',positions=[];
  block.forEach((node,offset)=>{
   if(node.isText){for(let i=0;i<node.text.length;i++){text+=node.text[i];positions.push(pos+1+offset+i);}}
   else {text+='\ufffc';positions.push(pos+1+offset);}
  });
  const segments=segmenter?[...segmenter.segment(text)].filter(part=>part.isWordLike):[...text.matchAll(/[\p{L}\p{M}\p{N}_]+(?:['’][\p{L}\p{M}\p{N}_]+)*/gu)].map(match=>({index:match.index,segment:match[0]}));
  for(const part of segments){const from=positions[part.index],to=positions[part.index+part.segment.length-1]+1;words.push({kind:'word',from,to,quote:part.segment});}
  return false;
 });
 return words;
}
export function wordAtRange(words,from,to){return words.find(word=>word.from===from&&word.to===to);}
// A word can span multiple mark nodes. Merge its final rendered line fragments;
// if an exceptionally long word breaks across lines, anchor beneath its final line.
export function wordLineFromRects(rects,workspace){
 const visible=Array.from(rects).filter(rect=>rect.width>0&&rect.height>0);
 if(!visible.length)return null;
 const last=visible.at(-1),line=visible.filter(rect=>rect.top<last.bottom&&rect.bottom>last.top);
 const left=Math.min(...line.map(rect=>rect.left)),right=Math.max(...line.map(rect=>rect.right)),bottom=Math.max(...line.map(rect=>rect.bottom));
 const bounds=workspace.getBoundingClientRect(),scaleX=bounds.width/workspace.offsetWidth||1,scaleY=bounds.height/workspace.offsetHeight||1;
 const x1=(left-bounds.left)/scaleX+workspace.scrollLeft,x2=(right-bounds.left)/scaleX+workspace.scrollLeft,y=(bottom-bounds.top)/scaleY+workspace.scrollTop;
 return {x1,x2,y,point:{x:(x1+x2)/2,y}};
}
export function measureWordLines(view,workspace,words){
 const result=new Map();
 for(const word of words){
  try{
   const start=view.domAtPos(word.from,1),end=view.domAtPos(word.to,-1),range=view.dom.ownerDocument.createRange();
   range.setStart(start.node,start.offset);range.setEnd(end.node,end.offset);
   const line=wordLineFromRects(range.getClientRects(),workspace);
   if(line)result.set(word.from+':'+word.to,{...word,...line});
  }catch{/* A just-removed word has no live DOM range until the next transaction. */}
 }
 return result;
}
