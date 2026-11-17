const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../ui-review-followup.js'), 'utf8');
function run(enabled, length, cut) {
  const nodes = Object.fromEntries(['language','autoReplenishToggle','autoReplenishPickerBtn','autoReplenishState','autoReplenishWarning'].map(id=>[id,{value:id==='language'?'zh':'', checked:enabled, attributes:{},setAttribute(k,v){this.attributes[k]=v;},getAttribute(k){return this.attributes[k];},addEventListener(){}}]));
  const window = {getAutoReplenishLength:()=>length,getCuttingItems:()=>[{length:cut}],addEventListener(){}};
  const document={getElementById:id=>nodes[id],querySelector:()=>null,querySelectorAll:()=>[],readyState:'complete',body:{classList:{contains:()=>false}}};
  vm.runInNewContext(source,{window,document,Number,MutationObserver:function(){this.observe=()=>{};},setTimeout});
  return nodes;
}
test('replenish state reads the existing public length API and warns for oversized cuts',()=>{
 const nodes=run(true,3000,4000);
 assert.match(nodes.autoReplenishState.textContent,/3,000/);
 assert.equal(nodes.autoReplenishWarning.hidden,false);
 assert.match(nodes.autoReplenishWarning.textContent,/4,000/);
});
test('disabled replenish preserves the existing selection and hides shortage warning',()=>{
 const nodes=run(false,3000,4000);
 assert.match(nodes.autoReplenishState.textContent,/已關閉/);
 assert.equal(nodes.autoReplenishWarning.hidden,true);
 assert.equal(nodes.autoReplenishPickerBtn.attributes['aria-pressed'],'false');
});
