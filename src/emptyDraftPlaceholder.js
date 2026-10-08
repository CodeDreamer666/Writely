import {Extension} from '@tiptap/core';
import {Plugin} from '@tiptap/pm/state';
import {Decoration,DecorationSet} from '@tiptap/pm/view';
export const EMPTY_DRAFT_PLACEHOLDER='Begin anywhere. Every thought has somewhere to go.';
export const EmptyDraftPlaceholder=Extension.create({
 name:'emptyDraftPlaceholder',
 addProseMirrorPlugins(){return [new Plugin({props:{decorations({doc}){
  if(doc.textContent.length)return DecorationSet.empty;
  let first=null;
  doc.descendants((node,pos)=>{if(first)return false;if(node.isTextblock){first=Decoration.node(pos,pos+node.nodeSize,{class:'empty-draft-line','data-placeholder':EMPTY_DRAFT_PLACEHOLDER});return false;}return true;});
  return first?DecorationSet.create(doc,[first]):DecorationSet.empty;
 }}})];}
});
