import {test,expect} from '@playwright/test';
test('Undo and Redo never cross document boundaries',async({page})=>{
 await page.goto('/');await expect(page.getByText('Saved locally',{exact:true})).toBeVisible();
 const originalB='Every morning, the neighbour opens her window';
 await page.getByRole('textbox',{name:'Document text'}).fill('Edited document A. Never move this into B.');
 await page.getByRole('button',{name:/A small observance.*words/}).click();
 await expect(page.getByRole('textbox',{name:'Document text'})).toContainText(originalB);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await page.getByRole('button',{name:'Redo',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Document text'})).toContainText(originalB);
 await page.getByRole('textbox',{name:'Document text'}).press('End');await page.keyboard.type(' A new ending.');await page.getByRole('button',{name:'Undo',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Document text'})).not.toContainText('A new ending.');
 await page.getByRole('button',{name:'Redo',exact:true}).click();await expect(page.getByRole('textbox',{name:'Document text'})).toContainText('A new ending.');
 await page.getByRole('button',{name:/The things we carry.*words/}).click();await expect(page.getByRole('textbox',{name:'Document text'})).toContainText('Edited document A.');
 await page.getByRole('button',{name:'Undo',exact:true}).click();await page.getByRole('button',{name:'Redo',exact:true}).click();await expect(page.getByRole('textbox',{name:'Document text'})).toContainText('Edited document A.');
 await expect(page.getByText('Saved locally',{exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('textbox',{name:'Document text'})).toContainText('Edited document A.');
 await page.getByRole('button',{name:/A small observance.*words/}).click();await expect(page.getByRole('textbox',{name:'Document text'})).toContainText(originalB);await expect(page.getByRole('textbox',{name:'Document text'})).not.toContainText('Edited document A.');
});
