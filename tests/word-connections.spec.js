import {test,expect} from '@playwright/test';
import {initial,KEY} from '../src/model.js';
const current=data=>data.docs.find(doc=>doc.id===data.active);
const state=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function aligned(page){
 await expect.poll(async()=>page.evaluate(key=>{
  const data=JSON.parse(localStorage.getItem(key)),doc=data.docs.find(doc=>doc.id===data.active),target=doc.cards[0].connectors[0].target;
  const group=document.querySelector(`[data-word-from="${target.from}"][data-word-to="${target.to}"]`),paragraph=[...document.querySelectorAll('.tiptap p')].find(p=>p.textContent.includes(target.quote));
  if(!group||!paragraph)return 10000;
  const offset=paragraph.textContent.indexOf(target.quote),walker=document.createTreeWalker(paragraph,NodeFilter.SHOW_TEXT),nodes=[];let node,total=0;
  while(node=walker.nextNode()){nodes.push({node,start:total,end:total+node.textContent.length});total+=node.textContent.length;}
  const first=nodes.find(item=>item.end>offset),last=nodes.find(item=>item.end>=offset+target.quote.length),range=document.createRange();
  range.setStart(first.node,offset-first.start);range.setEnd(last.node,offset+target.quote.length-last.start);
  const rects=[...range.getClientRects()].filter(rect=>rect.width&&rect.height),end=rects.at(-1),fragments=rects.filter(rect=>rect.top<end.bottom&&rect.bottom>end.top);
  const bounds={left:Math.min(...fragments.map(r=>r.left)),right:Math.max(...fragments.map(r=>r.right)),bottom:Math.max(...fragments.map(r=>r.bottom))};
  const workspace=document.querySelector('.workspace'),wr=workspace.getBoundingClientRect(),sx=wr.width/workspace.offsetWidth,sy=wr.height/workspace.offsetHeight;
  const x1=(bounds.left-wr.left)/sx+workspace.scrollLeft,x2=(bounds.right-wr.left)/sx+workspace.scrollLeft,y=(bounds.bottom-wr.top)/sy+workspace.scrollTop;
  const line=group.querySelector('line'),point=group.querySelector('circle'),arrows=[...document.querySelectorAll('.annotation-connectors g>circle')];
  const error=[Math.abs(+line.getAttribute('x1')-x1),Math.abs(+line.getAttribute('x2')-x2),Math.abs(+line.getAttribute('y1')-y),Math.abs(+point.getAttribute('cx')-(x1+x2)/2),Math.abs(+point.getAttribute('cy')-y),...arrows.flatMap(circle=>[Math.abs(+circle.getAttribute('cx')-(x1+x2)/2),Math.abs(+circle.getAttribute('cy')-y)])];
  return Math.max(...error);
 },KEY)).toBeLessThan(.6);
}
test('invisible word lines snap arrows through formatting, reflow, zoom, editing and reload',async({page})=>{
 const seed=initial(),doc=current(seed);doc.html='<p>Alpha re<strong>mark</strong>able café word.</p><p>Beta writing moves through a narrow column and wraps naturally onto new lines. Another remarkable idea.</p>';
 doc.cards=[{...doc.cards[0],connectors:[{id:'word-link',anchor:'right',target:{kind:'word',from:7,to:17,quote:'remarkable'}},{id:'legacy-link',anchor:'left',target:{kind:'text',from:7,to:17,quote:'remarkable'}}]}];
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({key,seed})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(seed));},{key:KEY,seed});
 await page.goto(process.env.WRITELY_TEST_URL||'/');await expect(page.locator('.word-connection-geometry g')).toHaveCount(20);await aligned(page);
 expect(await page.locator('.word-connection-geometry').evaluate(el=>getComputedStyle(el).visibility)).toBe('hidden');
 await page.setViewportSize({width:760,height:800});await aligned(page);
 await page.locator('.tiptap').evaluate(el=>{el.style.fontSize='31px';el.style.fontFamily='Georgia, serif';});await aligned(page);
 await page.locator('.tiptap').evaluate(el=>el.style.width='130px');await aligned(page);
 await page.locator('.tiptap').evaluate(el=>el.style.width='');await aligned(page);
 await page.locator('.workspace').evaluate(el=>el.style.zoom='1.2');await aligned(page);
 await page.locator('.workspace').evaluate(el=>el.scrollTop=60);await aligned(page);
 await page.locator('.workspace').evaluate(el=>el.style.zoom='');
 await page.locator('.tiptap').evaluate(el=>{el.style.fontSize='';el.style.fontFamily='';});
 await page.setViewportSize({width:1440,height:1000});await aligned(page);
 const editor=page.getByRole('textbox',{name:'Document text'});await editor.click();await editor.press('Control+Home');await page.keyboard.insertText('Before ');
 await expect.poll(async()=>current(await state(page)).cards[0].connectors[0].target.from).toBe(14);await aligned(page);
 await editor.press('Control+z');await expect.poll(async()=>current(await state(page)).cards[0].connectors[0].target.from).toBe(7);await aligned(page);
 await editor.press('Control+Shift+z');await expect.poll(async()=>current(await state(page)).cards[0].connectors[0].target.from).toBe(14);await aligned(page);
 await page.reload();await aligned(page);expect(current(await state(page)).cards[0].connectors[0].target.kind).toBe('word');
 // Selecting exactly one word uses the same logical word target through the existing controls.
 await editor.evaluate(el=>{const p=el.querySelector('p'),node=p.lastChild,range=document.createRange();const start=node.textContent.indexOf('café');range.setStart(node,start);range.setEnd(node,start+4);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);});
 const anchor=page.locator('.cloud-anchor');await anchor.focus();await anchor.press('Enter');await page.getByRole('button',{name:'Link selection',exact:true}).click();
 await expect.poll(async()=>current(await state(page)).cards[0].connectors.length).toBe(3);expect(current(await state(page)).cards[0].connectors.at(-1).target.kind).toBe('word');
 expect(current(await state(page)).html).not.toContain('word-connection');
 await page.getByRole('button',{name:'Hide all cards',exact:true}).click();await expect(page.locator('.word-connection-geometry g')).toHaveCount(21);await expect(page.locator('.annotation-cloud')).toHaveCount(0);
 expect(errors).toEqual([]);
});