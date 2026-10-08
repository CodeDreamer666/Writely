import assert from 'node:assert/strict';
import {fitCardShape} from '../src/cardLayout.js';
import {bubbleShapes} from '../src/bubbleShapes.js';
for(const shape of bubbleShapes){
 const small=fitCardShape(shape.id,200,40),large=fitCardShape(shape.id,200,400);
 assert(large.content.height>=400);assert(large.content.left>0);assert(large.content.left+large.content.width<200);
 assert.equal(large.content.top,small.content.top);assert(Math.abs((large.height-large.content.top-large.content.height)-(small.height-small.content.top-small.content.height))<1e-8);
 assert(large.height>small.height);assert(!large.path.includes('NaN'));
 for(const point of Object.values(large.anchors))assert(point.every(Number.isFinite));
}
console.log('Card layout tests passed: expandable centers, fixed borders and fitted anchors.');
