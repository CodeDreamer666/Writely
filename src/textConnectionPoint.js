// Resolve saved logical ranges against live DOM fragments, including wrapped text.
export function textConnectionPoint(view,workspace,target,side){
 if(!target||target.orphaned)return null;
 try{
  let rect;
  if(target.kind==='essay'){const r=view.dom.getBoundingClientRect();rect={left:r.left,right:r.right,top:r.top,bottom:r.top+Math.min(32,r.height)};}
  else{
   if(!Number.isInteger(target.from)||!Number.isInteger(target.to)||target.from<0||target.to>view.state.doc.content.size||target.to<=target.from)return null;
   const start=view.domAtPos(target.from,1),end=view.domAtPos(target.to,-1),range=view.dom.ownerDocument.createRange();range.setStart(start.node,start.offset);range.setEnd(end.node,end.offset);
   const rects=Array.from(range.getClientRects()).filter(r=>r.width>0&&r.height>0);
   const fragments=rects.filter(r=>!rects.some(other=>other!==r&&r.height>other.height+1&&other.top>=r.top&&other.bottom<=r.bottom&&other.left>=r.left&&other.right<=r.right));rect=side==='left'?fragments[0]:fragments.at(-1);if(!rect)return null;
  }
  const bounds=workspace.getBoundingClientRect(),sx=bounds.width/workspace.offsetWidth||1,sy=bounds.height/workspace.offsetHeight||1;
  return {x:((side==='left'?rect.left:rect.right)-bounds.left)/sx+workspace.scrollLeft+(side==='left'?-4:4),y:((rect.top+rect.bottom)/2-bounds.top)/sy+workspace.scrollTop};
 }catch{return null;}
}
