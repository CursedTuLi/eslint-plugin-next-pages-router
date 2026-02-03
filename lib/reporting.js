const { reportWithSuggestion } = require('./suggestions');

function reportRouteEvaluation(
  context,
  node,
  evaluation,
  messageIds,
  data,
  overrideSuggestion
) {
  if (!evaluation) {
    return false;
  }

  const status = evaluation.status;

  if (status === 'ok' || status === 'skip') {
    return false;
  }

  if (status === 'unknown') {
    if (!messageIds || !messageIds.unknown) {
      return false;
    }
    const suggestion =
      overrideSuggestion !== undefined ? overrideSuggestion : evaluation.suggestion;
    reportWithSuggestion(context, node, messageIds.unknown, data, suggestion);
    return true;
  }

  if (status === 'pattern') {
    if (!messageIds || !messageIds.pattern) {
      return false;
    }
    context.report({
      node,
      messageId: messageIds.pattern,
      data,
    });
    return true;
  }

  if (status === 'queryhash') {
    if (!messageIds || !messageIds.queryhash) {
      return false;
    }
    context.report({
      node,
      messageId: messageIds.queryhash,
      data,
    });
    return true;
  }

  return false;
}

module.exports = {
  reportRouteEvaluation,
};
