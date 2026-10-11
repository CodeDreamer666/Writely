import assert from 'node:assert/strict';
import {fitCardShape,layoutCard,cardContentWidth,CARD_MAX_WIDTH,CARD_MAX_HEIGHT} from '../src/cardLayout.js';
import {bubbleShapes} from '../src/bubbleShapes.js';
for(const shape of bubbleShapes){
 const small=fitCardShape(shape.id,200,40),large=fitCardShape(shape.id,200,400);
 assert(large.content.height>=400);assert(large.content.left>0);assert(large.content.left+large.content.width<200);
 assert.equal(large.content.top,small.content.top);assert(Math.abs((large.height-large.content.top-large.content.height)-(small.height-small.content.top-small.content.height))<1e-8);
 assert(large.height>small.height);assert(!large.path.includes('NaN'));
 for(const point of Object.values(large.anchors))assert(point.every(Number.isFinite));
}
for(const id of ['rectangle','rounded-square','thought-cloud']){
 const short=cardContentWidth(id,'Hm.'),medium=cardContentWidth(id,'Start with the woman on the bus? Let the image do the work.'),long=cardContentWidth(id,'word '.repeat(2000));
 assert(short<=medium&&medium<=long);assert(long+40<=CARD_MAX_WIDTH);assert(cardContentWidth(id,'word '.repeat(2000),220)<cardContentWidth(id,'word '.repeat(2000)));
 const small=layoutCard(id,{contentWidth:medium,textHeight:45}),big=layoutCard(id,{contentWidth:long,textHeight:5000});
 // Text stays inside the generated outline's bounds and grows in both directions.
 for(const layout of [small,big]){const c=layout.content;assert(c.left>0&&c.top>0&&c.left+c.width<layout.width&&c.top+c.height<layout.height);assert(!layout.path.includes('NaN'));for(const point of Object.values(layout.anchors))assert(point.every(n=>Number.isFinite(n)&&n>=0&&n<=1));}
 assert(big.width>small.width&&big.height>small.height);assert(!small.scroll&&big.scroll);
 // Past the maximum, the silhouette stops growing and the text column scrolls.
 assert(big.width<=CARD_MAX_WIDTH&&big.height<=CARD_MAX_HEIGHT+.5);assert.deepEqual(layoutCard(id,{contentWidth:long,textHeight:9000}),big);
 assert(small.width/small.height>1&&big.width/big.height>1);
}
// Cloud lobes keep a constant size rather than being stretched with the card.
const cloudArcs=layout=>[...layout.path.matchAll(/ A ([\d.]+)/g)].map(m=>Number(m[1]));
const smallCloud=cloudArcs(layoutCard('thought-cloud',{contentWidth:120,textHeight:45})),bigCloud=cloudArcs(layoutCard('thought-cloud',{contentWidth:240,textHeight:200}));
assert(bigCloud.length>smallCloud.length&&smallCloud.length>=7);assert(Math.max(...bigCloud)<=28*1.13);
// Every lobe is drawn as a small outward arc; an inner arc would cut a bite out of the cloud.
for(let w=40;w<=300;w+=6)for(let h=20;h<=320;h+=10)for(const arc of layoutCard('thought-cloud',{contentWidth:w,textHeight:h}).path.matchAll(/ A [\d.]+ [\d.]+ 0 (\d) (\d)/g))assert.deepEqual([arc[1],arc[2]],['0','1'],`cloud ${w}x${h} has an inward lobe`);
console.log('Card layout tests passed: generated silhouettes, proportional growth, capped scrolling and legacy warping.');
