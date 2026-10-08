import {test,expect} from '@playwright/test';
import {initial,KEY} from '../src/model.js';
import {selectableBubbleShapes} from '../src/bubbleShapes.js';
const read=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
const current=data=>data.docs.find(doc=>doc.id===data.active);
async function fit(page){await expect.poll(()=>page.locator('.annotation-cloud').evaluateAll(cards=>cards.flatMap(card=>{
 const text=card.querySelector('.cloud-text'),body=card.querySelector('.cloud-body'),path=card.querySelector('.cloud-shape path'),svg=card.querySelector('.cloud-shape'),r=text.getBoundingClientRect(),cr=card.getBoundingClientRect(),matrix=svg.getScreenCTM().inverse();
 const points=[];for(const x of [r.left,r.left+r.width/2,r.right])for(const y of [r.top,r.top+r.height/2,r.bottom])points.push(new DOMPoint(x,y).matrixTransform(matrix));
 return [r.bottom>cr.bottom+.5,r.right>cr.right+.5,text.scrollHeight>text.clientHeight+1,body.offsetHeight<card.offsetHeight-1,...points.map(point=>!path.isPointInFill(point))];
}).filter(Boolean).length)).toBe(0);}
test('all six shapes contain expanding text and preserve old long notes',async({page})=>{
 const seed=initial(),doc=current(seed);doc.cards=selectableBubbleShapes.map((shape,i)=>({...doc.cards[0],id:'shape-'+i,shape:shape.id,text:i===0?'Leaving ≠ becoming someone else. Stay with this feeling.':i===1?'Start with the woman on the bus? Let the image do the work.':'A thought with enough room to develop. '.repeat(8).slice(0,280),connectors:[]}));
 doc.cards.push({...doc.cards[0],id:'legacy',text:'Older note kept intact. '.repeat(30)});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(({key,seed})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(seed));},{key:KEY,seed});
 await page.goto(process.env.WRITELY_TEST_URL||'/');await expect(page.locator('.annotation-cloud')).toHaveCount(7);await fit(page);
 await page.screenshot({path:'evidence/card-fitting.png'});
 await page.getByRole('button',{name:'Customize thought 1',exact:true}).click();
 const textarea=page.getByLabel('Your thought');await textarea.fill('x'.repeat(600));await expect(textarea).toHaveValue('x'.repeat(600));await expect(page.locator('#card-character-count')).toHaveCount(0);await fit(page);
 await textarea.fill('👨‍👩‍👧‍👦'.repeat(300));await expect(textarea).toHaveValue('👨‍👩‍👧‍👦'.repeat(300));await fit(page);
 await page.getByRole('button',{name:'Close dialog',exact:true}).click();await page.getByRole('button',{name:'Customize thought 7',exact:true}).click();const legacy=doc.cards.at(-1).text;await expect(textarea).toHaveValue(legacy);await textarea.fill(legacy+'More');await expect(textarea).toHaveValue(legacy+'More');
 await textarea.fill(legacy.slice(0,-1));await expect(textarea).toHaveValue(legacy.slice(0,-1));await fit(page);
 await page.getByRole('button',{name:'Close dialog',exact:true}).click();await page.setViewportSize({width:390,height:844});await fit(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect.poll(async()=>current(await read(page)).cards.at(-1).text).toBe(legacy.slice(0,-1));await page.reload();await fit(page);expect(current(await read(page)).cards.at(-1).text).toBe(legacy.slice(0,-1));expect(errors).toEqual([]);
});
