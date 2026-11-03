const fs=require('fs'),path=require('path'),parser=require('@babel/parser'),traverse=require('@babel/traverse').default;
const strings=new Set();
function add(value){if(typeof value==='string'&&/[A-Za-z]/.test(value)&&value.trim().length>1&&value.length<1200)strings.add(value.replace(/\s+/g,' ').trim());}
function scan(dir){for(const name of fs.readdirSync(dir)){const file=path.join(dir,name);if(fs.statSync(file).isDirectory()){if(!/tests|fixtures/.test(file))scan(file);}else if(name.endsWith('.jsx')&&!/locale\.jsx$/.test(file)){
  const ast=parser.parse(fs.readFileSync(file,'utf8'),{sourceType:'module',plugins:['jsx']});traverse(ast,{
    JSXText(p){add(p.node.value);},JSXAttribute(p){if(['title','placeholder','aria-label','alt'].includes(p.node.name.name))add(p.node.value?.value);},
    JSXExpressionContainer(p){if(p.node.expression.type==='StringLiteral')add(p.node.expression.value);if(p.node.expression.type==='ConditionalExpression'){add(p.node.expression.consequent.value);add(p.node.expression.alternate.value);}},
    ObjectProperty(p){if(['label','title','badge','status'].includes(p.node.key.name))add(p.node.value.value);},
    VariableDeclarator(p){if(['label'].includes(p.node.id.name))add(p.node.init?.value);},
    AssignmentExpression(p){if(p.node.left.name==='label')add(p.node.right.value);}
  });
}}}
scan('src');for(const key of ['IDLE','SPEAKING','LISTENING','TRANSCRIBING','REASONING','REVIEW','CONFIRMED','Workforce reassignment','Approve reassignment','Estimated improvement','Return to original station'])add(key);
fs.writeFileSync('src/features/v2/ui-source.json',JSON.stringify([...strings].sort(),null,2)+'\n');console.log('Extracted '+strings.size+' static interface strings.');
