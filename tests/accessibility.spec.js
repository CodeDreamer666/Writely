import {test,expect} from '@playwright/test';
test('editor focus, toggle state and reduced-motion card navigation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await page.getByRole('textbox',{name:'Document text'}).focus();expect(await page.locator('.tiptap').evaluate(el=>getComputedStyle(el).outlineStyle)).toBe('solid');
 await expect(page.getByRole('button',{name:'Bold',exact:true})).toHaveAttribute('aria-pressed','false');await page.keyboard.press('Control+a');await page.getByRole('button',{name:'Bold',exact:true}).click();await expect(page.getByRole('button',{name:'Bold',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.evaluate(()=>{const el=document.querySelector('.workspace');const original=el.scrollTo.bind(el);el.scrollTo=options=>{window.lastScrollBehavior=options.behavior;original(options);};});
 await page.getByRole('button',{name:/Thoughts/}).click();await page.getByRole('button',{name:/A possible beginning.*Start with/}).click();expect(await page.evaluate(()=>window.lastScrollBehavior)).toBe('instant');
 await page.keyboard.press('Control+k');await page.getByRole('textbox',{name:'Search commands'}).focus();expect(await page.locator('.command-search').evaluate(el=>getComputedStyle(el).outlineStyle)).toBe('solid');
});
