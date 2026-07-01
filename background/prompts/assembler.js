var X1PromptAssembler = (function() {
  var templates = {
    default: {
      sections: ['identity', 'date', 'context', 'memory', 'graph', 'manual', 'world', 'persona', 'intentions', 'instructions'],
      maxTokens: 4000
    },
    agent: {
      sections: ['identity', 'date', 'context', 'world', 'agentGoal', 'constraints'],
      maxTokens: 2000
    },
    quick: {
      sections: ['identity', 'date', 'context'],
      maxTokens: 1000
    },
    creative: {
      sections: ['identity', 'persona', 'context', 'memory'],
      maxTokens: 3000
    },
    code: {
      sections: ['identity', 'date', 'context', 'codeContext'],
      maxTokens: 3000
    },
    research: {
      sections: ['identity', 'date', 'context', 'sources', 'instructions'],
      maxTokens: 4000
    }
  };

  var sectionBuilders = {
    identity: function() {
      return 'You are X1, an AI agent that lives in the browser. You can navigate, click, type, search, read pages, send emails, manage calendar, create documents, and more. You respond in the same language the user speaks.';
    },
    date: function(ctx) {
      var d = new Date();
      var days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      return 'Current date: ' + days[d.getDay()] + ', ' + d.toLocaleDateString('es-ES') + ' ' + d.toLocaleTimeString('es-ES');
    },
    context: function(ctx) {
      if (!ctx.pageContext) return '';
      return 'Current page: ' + ctx.pageContext;
    },
    memory: function(ctx) {
      if (!ctx.memory || ctx.memory.length === 0) return '';
      var recent = ctx.memory.slice(-6);
      return 'Recent conversation:\n' + recent.map(function(m) {
        return m.role + ': ' + (m.content || '').substring(0, 200);
      }).join('\n');
    },
    graph: function(ctx) {
      if (!ctx.graph || !ctx.graph.entities || ctx.graph.entities.length === 0) return '';
      return 'Known entities: ' + ctx.graph.entities.map(function(e) {
        return e.name + ' (' + e.type + ')';
      }).join(', ');
    },
    manual: function(ctx) {
      if (!ctx.manual || !ctx.manual.entries || ctx.manual.entries.length === 0) return '';
      return 'Knowledge: ' + ctx.manual.entries.map(function(e) {
        return e.topic + ': ' + (e.content || '').substring(0, 100);
      }).join('; ');
    },
    world: function(ctx) {
      if (!ctx.worldModel) return '';
      var w = ctx.worldModel;
      var parts = [];
      if (w.tabCount) parts.push(w.tabCount + ' tabs open');
      if (w.activeIntention) parts.push('Working on: ' + w.activeIntention);
      if (w.agentMode) parts.push('Mode: ' + w.agentMode);
      return parts.length > 0 ? 'World state: ' + parts.join('. ') : '';
    },
    persona: function(ctx) {
      return ctx.personaPrompt || '';
    },
    intentions: function(ctx) {
      if (!ctx.intentions || ctx.intentions.length === 0) return '';
      return 'Active intentions: ' + ctx.intentions.map(function(i) {
        return i.text + ' (' + i.status + ')';
      }).join('; ');
    },
    instructions: function(ctx) {
      return ctx.customInstructions || '';
    },
    agentGoal: function(ctx) {
      return ctx.agentGoal ? 'Goal: ' + ctx.agentGoal : '';
    },
    constraints: function(ctx) {
      return 'Constraints: Max 20 steps. Use done when complete. Report errors clearly. Stay focused on the goal.';
    },
    codeContext: function(ctx) {
      return ctx.codeContext || 'You can write, review, and explain code. Use standard practices.';
    },
    sources: function(ctx) {
      if (!ctx.sources || ctx.sources.length === 0) return '';
      return 'Sources:\n' + ctx.sources.map(function(s, i) {
        return (i + 1) + '. ' + s.title + ': ' + (s.snippet || '').substring(0, 150);
      }).join('\n');
    }
  };

  function assemble(templateName, context) {
    var template = templates[templateName] || templates.default;
    var sections = template.sections;
    var ctx = context || {};
    var parts = [];
    var totalLen = 0;

    for (var i = 0; i < sections.length; i++) {
      var builder = sectionBuilders[sections[i]];
      if (!builder) continue;
      var section = builder(ctx);
      if (!section) continue;
      if (totalLen + section.length > template.maxTokens * 4) break;
      parts.push(section);
      totalLen += section.length;
    }

    return parts.join('\n\n');
  }

  function addTemplate(name, config) {
    templates[name] = {
      sections: config.sections || ['identity', 'context'],
      maxTokens: config.maxTokens || 2000
    };
  }

  function addSectionBuilder(name, fn) {
    if (typeof fn === 'function') sectionBuilders[name] = fn;
  }

  function getTemplates() {
    var result = {};
    Object.keys(templates).forEach(function(k) {
      result[k] = { sections: templates[k].sections.slice(), maxTokens: templates[k].maxTokens };
    });
    return result;
  }

  function estimateTokens(text) {
    return Math.ceil((text || '').length / 4);
  }

  return {
    assemble: assemble,
    addTemplate: addTemplate,
    addSectionBuilder: addSectionBuilder,
    getTemplates: getTemplates,
    estimateTokens: estimateTokens
  };
})();
