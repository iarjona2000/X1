export const HOOK_DEFINITIONS = {
  beforeCommand: {
    description: 'Modify command before execution',
    signature: '(cmd, context) => cmd | Promise<cmd>',
    params: {
      cmd: 'The command string to be executed',
      context: 'Object containing { url, tabId, domain, userPreferences }'
    },
    returns: 'Modified command string or original cmd'
  },
  afterCommand: {
    description: 'Modify result after command execution',
    signature: '(result, context) => result | Promise<result>',
    params: {
      result: 'Action result object',
      context: 'Object containing { command, url, tabId }'
    },
    returns: 'Modified result object'
  },
  onResponse: {
    description: 'Modify AI response before display',
    signature: '(text, context) => text | Promise<text>',
    params: {
      text: 'The AI response text',
      context: 'Object containing { prompt, intent, pluginResult }'
    },
    returns: 'Modified text or original text'
  },
  onPageLoad: {
    description: 'Process page content when page loads',
    signature: '(url, content) => void | Promise<void>',
    params: {
      url: 'The page URL',
      content: 'Object containing { title, body, elements, favicon }'
    },
    returns: 'void'
  },
  onTimer: {
    description: 'Run every minute for background tasks',
    signature: '(minute) => void | Promise<void>',
    params: {
      minute: 'Current minute timestamp (floor of Date.now()/60000)'
    },
    returns: 'void'
  },
  onError: {
    description: 'Handle plugin errors',
    signature: '(error, context) => void | Promise<void>',
    params: {
      error: 'Error object',
      context: 'Object containing { pluginId, hook, originalParams }'
    },
    returns: 'void'
  }
};

export function createHookProxy(hookRegistry) {
  return {
    beforeCommand: (callback) => hookRegistry.register('beforeCommand', 'anonymous', callback),
    afterCommand: (callback) => hookRegistry.register('afterCommand', 'anonymous', callback),
    onResponse: (callback) => hookRegistry.register('onResponse', 'anonymous', callback),
    onPageLoad: (callback) => hookRegistry.register('onPageLoad', 'anonymous', callback),
    onTimer: (callback) => hookRegistry.register('onTimer', 'anonymous', callback),
    onError: (callback) => hookRegistry.register('onError', 'anonymous', callback)
  };
}