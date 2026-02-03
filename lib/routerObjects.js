const { unwrapChain, getMemberExpressionPath } = require('./ast');

function isAllowedRouterObject(node, allowedNames, allowedPaths) {
  const objPath = getMemberExpressionPath(node);

  if (!objPath) {
    return false;
  }

  const hasAllowlist =
    (Array.isArray(allowedNames) && allowedNames.length > 0) ||
    (Array.isArray(allowedPaths) && allowedPaths.length > 0);

  if (!hasAllowlist) {
    return true;
  }

  if (node.type === 'Identifier') {
    return allowedNames.includes(node.name);
  }

  return Array.isArray(allowedPaths) && allowedPaths.includes(objPath);
}

function isMemberExpressionOnAllowedObject(
  node,
  allowedNames,
  allowedPaths,
  allowedProps
) {
  const n = unwrapChain(node);

  if (!n || n.type !== 'MemberExpression' || n.computed) {
    return false;
  }
  if (n.property.type !== 'Identifier') {
    return false;
  }
  if (!allowedProps.includes(n.property.name)) {
    return false;
  }

  return isAllowedRouterObject(n.object, allowedNames, allowedPaths);
}

module.exports = {
  isAllowedRouterObject,
  isMemberExpressionOnAllowedObject,
};
