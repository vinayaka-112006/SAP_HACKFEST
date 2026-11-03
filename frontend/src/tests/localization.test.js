import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../features/v2/',import.meta.url);
test('all extracted legacy interface strings have complete static Hindi and Kannada resources',()=>{
 const source=JSON.parse(fs.readFileSync(new URL('ui-source.json',root),'utf8')),translations=JSON.parse(fs.readFileSync(new URL('ui-translations.json',root),'utf8'));
 for(const key of source)for(const language of ['hi','kn']){assert.ok(translations[key]?.[language]?.trim(),language+': '+key);assert.doesNotMatch(translations[key][language],/\?{3,}/);}
});
test('core translations contain no encoding replacement runs',()=>{
 const file=fs.readFileSync(new URL('locale.jsx',root),'utf8');assert.doesNotMatch(file,/\?{3,}/);assert.ok(file.includes('ಮೂಲ ಆಧಾರಿತ'));assert.ok(file.includes('स्रोत आधारित'));
});
