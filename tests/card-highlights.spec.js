import {test,expect} from '@playwright/test';
import {initial,KEY} from '../src/model.js';
const current=data=>data.docs.find(doc=>doc.id===data.active);
const read=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
test('exact temporary highlights respond to hover/selection and disappear with cards',async({page})=>{
 const seed=initial(),doc=current(seed);doc.html='<p>Alpha word. Second sentence.</p><p>Last paragraph.</p>';
 doc.cards=[{...doc.cards[0],id:'word-card',bg:'#D9E6F2',text:'Word note',y:64,connectors:[{id:'word-link',anchor:'right',target:{kind:'word',from:7,to:11,quote:'word'}}]},
 {...doc.cards[1],id:'sentence-card',bg:'#F5DCD6',text:'Sentence note',y:300,connectors:[{id:'sentence-link',anchor:'right',target:{kind:'text',from:13,to:29,quote:'Second sentence.'}}]},
 {...doc.cards[0],id:'paragraph-card',text:'Paragraph note',y:450,connectors:[{id:'paragraph-link',anchor:'right',target:{kind:'paragraph',from:31,to:46,quote:'Last paragraph.'}}]}];
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(({key,seed})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(seed));},{key:KEY,seed});await page.goto(process.env.WRITELY_TEST_URL||'/');
 const word=page.locator('[data-annotation-card="word-card"]');await expect(word).toHaveText('word');await expect(page.locator('[data-annotation-card="sentence-card"]')).toHaveText('Second sentence.');await expect(page.locator('[data-annotation-card="paragraph-card"]')).toHaveText('Last paragraph.');await expect(word).toHaveAttribute('data-highlight-state','default');
 const background=()=>word.evaluate(el=>getComputedStyle(el).backgroundColor);const normal=await background();
 const card=page.locator('[data-card-id="word-card"]');await card.hover();await expect(word).toHaveAttribute('data-highlight-state','hovered');const hover=await background();expect(hover).not.toBe(normal);
 await card.locator('.cloud-body').click();await card.locator('.cloud-body').press('ArrowLeft');await expect(word).toHaveAttribute('data-highlight-state','selected');expect(await background()).not.toBe(hover);
 await page.screenshot({path:'evidence/card-highlights.png'});
 await expect.poll(async()=>current(await read(page)).cards[0].placement).toBe('free');expect(current(await read(page)).html).toBe(doc.html);
 await page.getByRole('button',{name:'Hide all cards',exact:true}).click();await expect(page.locator('.card-text-highlight')).toHaveCount(0);await expect(page.locator('.annotation-connectors g')).toHaveCount(0);await expect(page.locator('.cloud-anchor')).toHaveCount(0);expect(current(await read(page)).html).toBe(doc.html);
 await page.getByRole('button',{name:'Show all cards',exact:true}).click();await expect(word).toHaveText('word');
 const editor=page.getByRole('textbox',{name:'Document text'});await editor.click();await editor.press('Control+Home');await page.keyboard.insertText('Before ');await expect.poll(async()=>current(await read(page)).html.startsWith('<p>Before ')).toBe(true);await expect(word).toHaveText('word');
 await editor.press('Control+z');await expect.poll(async()=>current(await read(page)).html).toBe(doc.html);await expect(word).toHaveText('word');
 await page.reload();await expect(word).toHaveText('word');expect(current(await read(page)).html).not.toContain('card-text-highlight');expect(errors).toEqual([]);
});
