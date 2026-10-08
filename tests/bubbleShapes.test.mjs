import assert from 'node:assert/strict';
import {bubbleShapes,selectableBubbleShapes,resolveShape,getShapeAnchors} from '../src/bubbleShapes.js';

assert.deepEqual(selectableBubbleShapes.map(shape=>shape.name),[
 'Rectangle','Rounded speech','Thought cloud'
]);
assert.equal(resolveShape(null).id,'rectangle');
assert.equal(resolveShape('unknown').id,'rectangle');
const legacyIds=['oval','comic-burst','heart','up-callout','cloud-speech','trapezoid','wide-cloud','splash','slanted','starburst','round'];
for(const id of legacyIds){
 assert(!selectableBubbleShapes.some(shape=>shape.id===id));
 assert.equal(resolveShape(id).id,id);
 assert(resolveShape(id).path.startsWith('M '));
 assert.equal(Object.keys(getShapeAnchors(id)).length,4);
}
for(const shape of bubbleShapes){
 assert.equal(resolveShape(shape.id),shape);
 for(const point of Object.values(getShapeAnchors(shape.id)))assert(point.every(Number.isFinite));
}
// Existing explicit shapes and inherited legacy defaults survive saved-data round trips.
const saved={defaultNoteShape:'wide-cloud',docs:[{cards:bubbleShapes.map(shape=>({id:shape.id,shape:shape.id})).concat({id:'inherited',shape:null})}]};
const loaded=JSON.parse(JSON.stringify(saved));
assert.deepEqual(loaded,saved);
for(const card of loaded.docs[0].cards)assert.equal(resolveShape(card.shape||loaded.defaultNoteShape).id,card.shape||'wide-cloud');
console.log('Bubble shape tests passed: three picker choices, all legacy paths/anchors, rectangle fallback, and saved-data preservation.');