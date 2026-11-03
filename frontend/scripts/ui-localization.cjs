// Compile-time localization of legacy JSX; original report/data expressions stay untouched.
module.exports=function({types:t}){return {visitor:{
  Program:{enter(path,state){
    if(!/[\\/]src[\\/].*\.jsx$/.test(state.filename||'')||/features[\\/]v2[\\/]locale\.jsx$/.test(state.filename||''))return;
    state.uiEnabled=true;
    path.unshiftContainer('body',t.importDeclaration([t.importSpecifier(t.identifier('__toolsathiUi'),t.identifier('translateUi')),t.importSpecifier(t.identifier('__toolsathiLocale'),t.identifier('useLocale'))],t.stringLiteral('/src/features/v2/locale.jsx')));
  }},
  FunctionDeclaration(path,state){if(state.uiEnabled&&/^[A-Z]/.test(path.node.id?.name||'')&&path.get('body').isBlockStatement()){let jsx=false;path.traverse({JSXElement(){jsx=true;}});if(jsx)path.node.body.body.unshift(t.expressionStatement(t.callExpression(t.identifier('__toolsathiLocale'),[])));}},
  JSXText(path,state){if(!state.uiEnabled||['style','script','code','pre'].includes(path.parent.openingElement?.name?.name))return;const value=path.node.value.replace(/\s+/g,' ');if(/[A-Za-z]/.test(value)&&value.trim().length>1)path.replaceWith(t.jsxExpressionContainer(t.callExpression(t.identifier('__toolsathiUi'),[t.stringLiteral(value)])));},
  JSXAttribute(path,state){if(state.uiEnabled&&['title','placeholder','aria-label','alt'].includes(path.node.name.name)&&t.isStringLiteral(path.node.value))path.node.value=t.jsxExpressionContainer(t.callExpression(t.identifier('__toolsathiUi'),[path.node.value]));},
  JSXExpressionContainer(path,state){
    if(!state.uiEnabled||['style','script','code','pre'].includes(path.parent.openingElement?.name?.name))return;const expression=path.node.expression;
    if(t.isStringLiteral(expression)&&/[A-Za-z]/.test(expression.value))path.node.expression=t.callExpression(t.identifier('__toolsathiUi'),[expression]);
    else if(t.isMemberExpression(expression)&&['label','title','badge'].includes(expression.property.name)||t.isIdentifier(expression)&&expression.name==='label')path.node.expression=t.callExpression(t.identifier('__toolsathiUi'),[expression]);
    else if(t.isConditionalExpression(expression))for(const key of ['consequent','alternate'])if(t.isStringLiteral(expression[key]))expression[key]=t.callExpression(t.identifier('__toolsathiUi'),[expression[key]]);
  }
}};};
