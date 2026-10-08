import assert from 'node:assert/strict';
import {highlightRanges} from '../src/cardHighlights.js';
const cards=[{id:'card',bg:'#FBEFB5',connectors:[{target:{kind:'word',from:2,to:5}},{target:{kind:'essay'}},{target:{kind:'text',from:1,to:99}},{target:{kind:'paragraph',from:6,to:10,orphaned:true}}]}];
assert.equal(highlightRanges(cards,null,null,20).length,1);assert.equal(highlightRanges(cards,null,null,20)[0].opacity,32);assert.equal(highlightRanges(cards,null,'card',20)[0].opacity,42);assert.equal(highlightRanges(cards,'card','card',20)[0].opacity,52);assert.deepEqual(highlightRanges([],null,null,20),[]);assert.deepEqual(highlightRanges(cards,null,null,20)[0].to,20);
console.log('Highlight tests passed: exact ranges, essay targets, hover/selection priority, hidden cards and orphaned/invalid ranges.');

const overlapping=[{id:'a',bg:'#FBEFB5',connectors:[{target:{from:1,to:8}},{target:{from:1,to:8}}]},{id:'b',bg:'#DDEBDD',connectors:[{target:{from:5,to:12}}]}];
const split=highlightRanges(overlapping,null,null,20);assert.deepEqual(split.map(r=>[r.from,r.to,r.cardIds.length]),[[1,5,1],[5,8,2],[8,12,1]]);assert.equal(split[1].color,'#C8C5BE');assert.equal(split[0].color,'#FBEFB5');assert.equal(split[2].color,'#DDEBDD');assert.equal(highlightRanges(overlapping,'a','b',20)[1].color,'#FBEFB5');assert.equal(highlightRanges(overlapping,null,'b',20)[1].color,'#DDEBDD');assert.equal(highlightRanges(overlapping,null,'b',20)[0].color,'#FBEFB5');
