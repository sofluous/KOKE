import assert from 'node:assert/strict';
import { configurePointerControls } from '../src/interaction-controls.js';

const controls={mouseButtons:{}},mouse={PAN:2,ROTATE:0};let contextHandler;
const canvas={addEventListener(type,handler){if(type==='contextmenu')contextHandler=handler;}};
assert.deepEqual(configurePointerControls(controls,mouse,canvas),{left:'tool',middle:'pan',right:'orbit',wheel:'zoom'});
assert.deepEqual(controls.mouseButtons,{LEFT:-1,MIDDLE:2,RIGHT:0});
let prevented=false;contextHandler({preventDefault(){prevented=true;}});assert.equal(prevented,true);
assert.throws(()=>configurePointerControls({},mouse,canvas));
console.log('PASS pointer mapping reserves left for tools and fixes camera gestures');
