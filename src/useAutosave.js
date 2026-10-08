import {useCallback,useEffect,useRef,useState} from 'react';
import {KEY} from './model';
export function useAutosave(data){
 const latest=useRef(data);latest.current=data;
 const [status,setStatus]=useState('idle');const pending=useRef(false),saveTimer=useRef(0),delayTimer=useRef(0),fadeTimer=useRef(0),alive=useRef(true);
 const attempt=useCallback(()=>{
  clearTimeout(saveTimer.current);clearTimeout(delayTimer.current);clearTimeout(fadeTimer.current);delayTimer.current=0;pending.current=false;
  try{localStorage.setItem(KEY,JSON.stringify(latest.current));if(alive.current){setStatus('saved');fadeTimer.current=setTimeout(()=>setStatus('idle'),1400);}}
  catch{if(alive.current)setStatus('error');}
 },[]);
 useEffect(()=>{
  clearTimeout(saveTimer.current);clearTimeout(fadeTimer.current);setStatus(old=>old==='error'||old==='saving'?old:'idle');
  if(!pending.current){pending.current=true;delayTimer.current=setTimeout(()=>{delayTimer.current=0;if(pending.current)setStatus(old=>old==='error'?old:'saving');},500);}
  saveTimer.current=setTimeout(attempt,350);
 },[data,attempt]);
 useEffect(()=>{alive.current=true;const flush=()=>{if(pending.current)attempt();};window.addEventListener('pagehide',flush);return()=>{alive.current=false;window.removeEventListener('pagehide',flush);clearTimeout(saveTimer.current);clearTimeout(delayTimer.current);clearTimeout(fadeTimer.current);};},[attempt]);
 return {status,retry:attempt};
}
