import {useEffect} from 'react';

// Client coordinates and scroll distances use the actual manuscript viewport.
export function flowAdjustment(caretY,top,height,scrollTop,maxScroll){
 if(height<=0||caretY<=top+height*.58)return 0;
 return Math.max(0,Math.min(maxScroll-scrollTop,caretY-(top+height*.47)));
}
export function installFlowAnchor(editor,workspace){
 const dom=editor.view.dom,media=matchMedia('(prefers-reduced-motion: reduce)');
 let timer=0,frame=0,active=false,suspended=false,streak=0,lastInput=0,lastIntent=0,expectedScroll=null,composing=false,disposed=false;
 const stop=()=>{clearTimeout(timer);cancelAnimationFrame(frame);timer=frame=0;};
 const suspend=()=>{stop();active=false;suspended=true;streak=0;};
 const valid=()=>!disposed&&!editor.isDestroyed&&editor.isFocused&&editor.state.selection.empty&&!composing;
 const bounds=()=>{const rect=workspace.getBoundingClientRect(),vv=window.visualViewport;const top=Math.max(rect.top,vv?.offsetTop||0);let bottom=Math.min(rect.bottom,(vv?.offsetTop||0)+(vv?.height||innerHeight));const tools=document.querySelector('.workspace-tools.tools-open')?.getBoundingClientRect();if(tools&&tools.width>tools.height&&tools.top>top&&tools.top<bottom)bottom=tools.top-12;return {top,height:Math.max(0,bottom-top)};};
 const settle=()=>{
 timer=0;if(!active||!valid())return;
 const {top,height}=bounds();const caret=editor.view.coordsAtPos(editor.state.selection.head);
 const delta=flowAdjustment((caret.top+caret.bottom)/2,top,height,workspace.scrollTop,workspace.scrollHeight-workspace.clientHeight);if(delta<2)return;
 stop();const from=workspace.scrollTop,target=from+delta;
 const write=value=>{expectedScroll=value;workspace.scrollTop=value;expectedScroll=workspace.scrollTop;};
 if(media.matches){write(target);return;}
 const start=performance.now();const tick=now=>{if(!active||!valid())return;const t=Math.min(1,(now-start)/340);write(from+(target-from)*(1-Math.pow(1-t,3)));if(t<1)frame=requestAnimationFrame(tick);else frame=0;};frame=requestAnimationFrame(tick);
 };
 const beforeInput=e=>{if(e.inputType?.startsWith('insert')){lastIntent=performance.now();}};
 const input=e=>{
 if(!e.inputType?.startsWith('insert')||!valid())return;
 const now=performance.now();streak=now-lastInput<1500?streak+1:1;lastInput=now;lastIntent=now;
 const paste=e.inputType==='insertFromPaste'||e.inputType==='insertFromDrop';
 if(paste||streak>=(suspended?3:2)){active=true;suspended=false;}
 clearTimeout(timer);if(active)timer=setTimeout(settle,paste?300:e.inputType==='insertParagraph'||/[.!?;,:\n]$/.test(e.data||'')?220:300);
 };
 const paste=()=>{if(!valid())return;active=true;suspended=false;streak=0;lastIntent=performance.now();clearTimeout(timer);timer=setTimeout(settle,300);};
 const key=e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End','Escape','Tab'].includes(e.key)||(e.ctrlKey||e.metaKey)&&['f','g','k','z','a'].includes(e.key.toLowerCase()))suspend();};
 const scroll=()=>{if(expectedScroll!==null&&Math.abs(workspace.scrollTop-expectedScroll)<2)return;if(performance.now()-lastIntent<100&&!frame)return;suspend();expectedScroll=null;};
 const selection=()=>{if(!editor.state.selection.empty)suspend();};
 const startComposition=()=>{composing=true;stop();};const endComposition=()=>{composing=false;input({inputType:'insertText',data:''});};
 const resize=()=>{workspace.style.setProperty('--flow-bottom-space',Math.round(bounds().height*.55)+'px');};
 const observer=new ResizeObserver(resize);observer.observe(workspace);resize();
 const previous=editor.options.editorProps.handleScrollToSelection;
 const handleScroll=view=>active&&valid()||previous?.(view)||false;
 editor.setOptions({editorProps:{...editor.options.editorProps,handleScrollToSelection:handleScroll}});
 dom.addEventListener('paste',paste,true);dom.addEventListener('drop',paste,true);dom.addEventListener('beforeinput',beforeInput);dom.addEventListener('input',input);dom.addEventListener('compositionstart',startComposition);dom.addEventListener('compositionend',endComposition);
 document.addEventListener('keydown',key,true);document.addEventListener('pointerdown',suspend,true);document.addEventListener('wheel',suspend,{passive:true,capture:true});document.addEventListener('touchmove',suspend,{passive:true,capture:true});dom.addEventListener('blur',suspend);workspace.addEventListener('scroll',scroll,{passive:true});editor.on('selectionUpdate',selection);window.visualViewport?.addEventListener('resize',resize);
 return()=>{disposed=true;stop();observer.disconnect();workspace.style.removeProperty('--flow-bottom-space');dom.removeEventListener('paste',paste,true);dom.removeEventListener('drop',paste,true);dom.removeEventListener('beforeinput',beforeInput);dom.removeEventListener('input',input);dom.removeEventListener('compositionstart',startComposition);dom.removeEventListener('compositionend',endComposition);document.removeEventListener('keydown',key,true);document.removeEventListener('pointerdown',suspend,true);document.removeEventListener('wheel',suspend,true);document.removeEventListener('touchmove',suspend,true);dom.removeEventListener('blur',suspend);workspace.removeEventListener('scroll',scroll);editor.off('selectionUpdate',selection);window.visualViewport?.removeEventListener('resize',resize);if(!editor.isDestroyed)editor.setOptions({editorProps:{...editor.options.editorProps,handleScrollToSelection:previous}});};
}
export function useFlowAnchor(editor,workspace,enabled){useEffect(()=>{
 if(!editor||!enabled)return;
 let cleanup;
 const stop=()=>{cleanup?.();cleanup=undefined;};
 const mount=()=>{stop();if(workspace.current&&!editor.isDestroyed)cleanup=installFlowAnchor(editor,workspace.current);};
 editor.on('mount',mount);editor.on('unmount',stop);mount();
 return()=>{editor.off('mount',mount);editor.off('unmount',stop);stop();};
},[editor,workspace,enabled]);}
