import {Extension} from '@tiptap/core';
import {Plugin} from '@tiptap/pm/state';
import {Decoration,DecorationSet} from '@tiptap/pm/view';
export const FocusParagraph=Extension.create({name:'focusParagraph',addProseMirrorPlugins(){return [new Plugin({props:{decorations(state){const {$from}=state.selection;for(let depth=$from.depth;depth>0;depth--){const node=$from.node(depth);if(node.isTextblock){const start=$from.before(depth);return DecorationSet.create(state.doc,[Decoration.node(start,start+node.nodeSize,{class:'current-paragraph'})]);}}return DecorationSet.empty;}}})];}});
