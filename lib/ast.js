function unwrapChain(node) {
  return node && node.type === 'ChainExpression' ? node.expression : node;
}

function isStringLiteral(node) {
  const n = unwrapChain(node);

  return (
    (n && n.type === 'Literal' && typeof n.value === 'string') ||
    (n && n.type === 'TemplateLiteral' && n.expressions.length === 0)
  );
}

function getStringLiteralValue(node) {
  const n = unwrapChain(node);

  if (!n) {
    return null;
  }
  if (n.type === 'Literal') {
    return n.value;
  }
  if (n.type === 'TemplateLiteral') {
    return n.quasis[0].value.cooked;
  }

  return null;
}

function getMemberExpressionPath(node) {
  const n = unwrapChain(node);

  if (!n) {
    return null;
  }
  if (n.type === 'Identifier') {
    return n.name;
  }
  if (n.type !== 'MemberExpression' || n.computed) {
    return null;
  }
  if (n.property.type !== 'Identifier') {
    return null;
  }

  const left = getMemberExpressionPath(n.object);

  if (!left) {
    return null;
  }

  return left + '.' + n.property.name;
}

function getObjectPropertyValue(obj, keyName) {
  if (!obj || obj.type !== 'ObjectExpression') {
    return null;
  }

  for (const prop of obj.properties) {
    if (!prop || prop.type !== 'Property' || prop.computed) {
      continue;
    }

    const key = prop.key;
    const keyValue =
      key.type === 'Identifier' ? key.name : key.type === 'Literal' ? key.value : null;

    if (keyValue === keyName) {
      return prop.value;
    }
  }

  return null;
}

function getMemberCallInfo(node) {
  const call = unwrapChain(node);

  if (!call || call.type !== 'CallExpression') {
    return null;
  }

  const callee = unwrapChain(call.callee);

  if (
    !callee ||
    callee.type !== 'MemberExpression' ||
    callee.computed ||
    callee.property.type !== 'Identifier'
  ) {
    return null;
  }

  return {
    callNode: call,
    callee,
    method: callee.property.name,
  };
}

function getRouterMethodCall(node, allowedMethods) {
  const callInfo = getMemberCallInfo(node);

  if (!callInfo) {
    return null;
  }

  const { callNode, callee, method } = callInfo;

  if (Array.isArray(allowedMethods) && !allowedMethods.includes(method)) {
    return null;
  }

  return { callNode, callee, method };
}

module.exports = {
  unwrapChain,
  isStringLiteral,
  getStringLiteralValue,
  getMemberExpressionPath,
  getObjectPropertyValue,
  getMemberCallInfo,
  getRouterMethodCall,
};
