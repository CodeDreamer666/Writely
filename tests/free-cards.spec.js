import {test,expect} from '@playwright/test';
import {initial,KEY} from '../src/model.js';
import {CARD_MAX_WIDTH,CARD_MAX_HEIGHT} from '../src/cardLayout.js';
const read=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
const current=data=>data.docs.find(doc=>doc.id===data.active);
const long='A thought that keeps going, the way thoughts do when nobody is counting. '.repeat(14);
async function open(page,cards){
 const seed=initial(),doc=current(seed);doc.cards=cards.map((card,i)=>({...doc.cards[0],connectors:[],...card}));
 await page.addInitScript(({key,seed})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(seed));},{key:KEY,seed});
 await page.goto(process.env.WRITELY_TEST_URL||'/');await page.getByRole('button',{name:'Close document list',exact:true}).click();await page.waitForTimeout(300);
}
// Every sampled point of the text column (including a scrolling column) must fall inside the drawn outline.
const textInsideOutline=card=>card.evaluate(el=>{
 const text=el.querySelector('.cloud-text'),path=el.querySelector('.cloud-shape path'),matrix=el.querySelector('.cloud-shape').getScreenCTM().inverse(),r=text.getBoundingClientRect();
 const misses=[];for(let i=0;i<=4;i++)for(let j=0;j<=4;j++){const p=new DOMPoint(r.left+r.width*i/4,r.top+r.height*j/4).matrixTransform(matrix);if(!path.isPointInFill(p))misses.push([i,j]);}
 return misses;
});
test('expanded cards move over the page while leaves stay in their margin, each remembering its own place',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await open(page,[{id:'free',side:'left',placement:'margin',y:160,connectors:[{id:'link',anchor:'right',target:{kind:'word',from:5,to:8,quote:'bus'}}]}]);
 const card=page.locator('[data-card-id="free"]'),paper=await page.locator('.paper').boundingBox(),before=await card.boundingBox(),prose=()=>page.locator('.ProseMirror p').evaluateAll(ps=>ps.map(p=>[p.textContent,JSON.stringify(p.getBoundingClientRect())])),layout=await prose();
 expect(before.x+before.width).toBeLessThanOrEqual(paper.x);
 const body=card.locator('.cloud-body'),b=await body.boundingBox();
 await page.mouse.move(b.x+40,b.y+30);await page.mouse.down();await page.mouse.move(paper.x+200,b.y+80,{steps:12});await page.mouse.up();
 const moved=await card.boundingBox();
 expect(moved.x).toBeGreaterThan(paper.x+100);expect(Math.abs(moved.y-(before.y+50))).toBeLessThan(2);
 // Overlapping the document changes nothing about its layout or text.
 expect(await prose()).toEqual(layout);
 await expect(page.locator('.annotation-connectors g>path')).toHaveCount(1);await expect(card.locator('.cloud-anchor')).toHaveCount(1);
 await expect.poll(async()=>current(await read(page)).cards[0].placement).toBe('free');
 await page.screenshot({path:'evidence/free-card-over-page.png'});
 // Collapsing puts the leaf in the margin, never on the page.
 await page.getByRole('button',{name:'Collapse thought 1',exact:true}).click();const leaf=page.getByRole('button',{name:'Expand thought 1',exact:true});
 let l=await leaf.boundingBox();expect(l.x+l.width<=paper.x-12||l.x>=paper.x+paper.width+12).toBe(true);
 await page.mouse.move(l.x+20,l.y+20);await page.mouse.down();await page.mouse.move(paper.x+paper.width/2,l.y+80,{steps:10});await page.mouse.up();
 l=await leaf.boundingBox();expect(l.x+l.width<=paper.x-12||l.x>=paper.x+paper.width+12).toBe(true);expect(l.y).toBeGreaterThan(0);
 // Expanding returns the card to where it was left; collapsing returns the leaf to its own spot.
 await leaf.click();await expect.poll(async()=>(await card.boundingBox()).x).toBeCloseTo(moved.x,0);expect((await card.boundingBox()).y).toBeCloseTo(moved.y,0);
 await page.getByRole('button',{name:'Collapse thought 1',exact:true}).click();await expect.poll(async()=>(await leaf.boundingBox()).x).toBeCloseTo(l.x,0);expect((await leaf.boundingBox()).y).toBeCloseTo(l.y,0);
 await page.reload();await page.getByRole('button',{name:'Close document list',exact:true}).click();await page.waitForTimeout(300);
 expect((await leaf.boundingBox()).x).toBeCloseTo(l.x,0);await leaf.click();await expect.poll(async()=>(await card.boundingBox()).x).toBeCloseTo(moved.x,0);
 // Keyboard movement is equally free for the expanded card.
 await card.locator('.cloud-body').focus();await page.keyboard.press('ArrowRight');await expect.poll(async()=>(await card.boundingBox()).x).toBeCloseTo(moved.x+8,0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
test('shapes keep their silhouette as text grows, cap their size and scroll long thoughts',async({page})=>{
 const shapes=['rectangle','rounded-square','thought-cloud'],texts=['Hm.','Start with the woman on the bus? Let the image do the work.',long];
 await open(page,shapes.flatMap((shape,i)=>texts.map((text,j)=>({id:`${shape}-${j}`,shape,text,placement:'free',x:.02+j*.36,y:80+i*330,side:j?'right':'left'}))));
 for(const shape of shapes){
  const boxes=[];for(let j=0;j<3;j++){const card=page.locator(`[data-card-id="${shape}-${j}"]`);await expect(card).toBeVisible();boxes.push(await card.boundingBox());expect(await textInsideOutline(card)).toEqual([]);}
  // Cards grow in both directions, never becoming a narrow tower.
  expect(boxes[1].width).toBeGreaterThan(boxes[0].width);for(const box of boxes)expect(box.width/box.height).toBeGreaterThan(shape==='thought-cloud'?1.05:1.1);
  expect(boxes[2].width).toBeLessThanOrEqual(CARD_MAX_WIDTH+.5);expect(boxes[2].height).toBeLessThanOrEqual(CARD_MAX_HEIGHT+.5);
  const text=page.locator(`[data-card-id="${shape}-2"] .cloud-text`);await expect(text).toHaveAttribute('data-scroll','true');
  const scroll=await text.evaluate(el=>({overflow:getComputedStyle(el).overflowY,more:el.scrollHeight>el.clientHeight+20}));expect(scroll).toEqual({overflow:'auto',more:true});
  await text.hover();await page.mouse.wheel(0,120);await expect.poll(()=>text.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 }
 // A thought cloud is drawn with many round lobes, not a stretched polygon.
 expect(await page.locator('[data-card-id="thought-cloud-2"] .cloud-shape path').getAttribute('d')).toMatch(/( A [^A]+){9,}/);
 await expect(page.locator('[data-card-id="thought-cloud-2"] .cloud-shape circle')).toHaveCount(2);
 await page.screenshot({path:'evidence/card-shapes.png',fullPage:true});
});
test('thoughts have no length limit and the preview mirrors the real card',async({page})=>{
 await open(page,[{id:'only',side:'left',placement:'margin',y:120,shape:'thought-cloud',text:'Short.'}]);
 await page.getByRole('button',{name:'Customize thought 1',exact:true}).click();const modal=page.getByRole('dialog',{name:'Customize thought'}),textarea=modal.getByLabel('Your thought');
 const modalBefore=await modal.boundingBox();await expect(modal.locator('.card-text-count,#card-text-count')).toHaveCount(0);expect(await textarea.getAttribute('maxlength')).toBeNull();
 const text='x'.repeat(80)+' '+long;await textarea.fill(text);await expect(textarea).toHaveValue(text);
 await expect.poll(async()=>current(await read(page)).cards[0].text).toBe(text);
 const modalAfter=await modal.boundingBox();expect(Math.abs(modalAfter.height-modalBefore.height)).toBeLessThan(2);expect(await textarea.evaluate(el=>el.clientHeight<=220)).toBe(true);
 const preview=modal.locator('.card-live-preview'),card=page.locator('[data-card-id="only"]');
 await expect(preview).toHaveAttribute('data-shape','thought-cloud');await expect(preview.locator('.cloud-text')).toHaveAttribute('data-scroll','true');
 expect(await preview.locator('.cloud-shape path').getAttribute('d')).toBe(await card.locator('.cloud-shape path').getAttribute('d'));
 expect(await preview.evaluate(el=>getComputedStyle(el).getPropertyValue('--cloud-fill'))).toBe(await card.evaluate(el=>getComputedStyle(el).getPropertyValue('--cloud-fill')));
 await modal.getByRole('button',{name:'Thought bubble: Rectangle',exact:true}).click();await expect(preview).toHaveAttribute('data-shape','rectangle');
 await page.screenshot({path:'evidence/card-preview-long.png'});
 await modal.getByRole('button',{name:'Close dialog',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Close document list',exact:true}).click();
 await expect(page.locator('[data-card-id="only"] .cloud-text')).toHaveText(text);
});
