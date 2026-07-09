var X1MCPAgents = (function() {
  var MCPAGENTS = [
    { id: 'mcp-context7',    name: 'Context7',    category: 'docs',     tools: ['resolve-library-id', 'query-docs'],                    color: '#6366f1', letter: 'C7', description: 'Live documentation for any library/framework (59k stars)' },
    { id: 'mcp-github',      name: 'GitHub',      category: 'devops',   tools: ['repos', 'issues', 'PRs', 'branches', 'search'],       color: '#24292e', letter: 'GH', description: 'Official GitHub MCP - repos, issues, PRs (28k stars)' },
    { id: 'mcp-october',     name: 'Oct. Themes', category: 'design',   tools: ['get_theme', 'get_theme_by_id'],                       color: '#f59e0b', letter: 'OT', description: '1000+ curated design system themes for AI UI' },
    { id: 'mcp-firecrawl',   name: 'Firecrawl',   category: 'research', tools: ['scrape', 'search', 'crawl', 'extract'],              color: '#ef4444', letter: 'FC', description: 'Web scraping, crawling, search (6.4k stars)' },
    { id: 'mcp-cf-docs',     name: 'CF Docs',     category: 'devops',   tools: ['search_docs'],                                       color: '#f6821f', letter: 'CD', description: 'Cloudflare documentation search' },
    { id: 'mcp-cf-builds',   name: 'CF Builds',   category: 'devops',   tools: ['list_builds', 'get_build'],                          color: '#f6821f', letter: 'CB', description: 'Cloudflare Workers builds' },
    { id: 'mcp-cf-bindings', name: 'CF Bindings', category: 'devops',   tools: ['list_bindings', 'get_binding'],                       color: '#f6821f', letter: 'CN', description: 'Cloudflare Workers bindings (KV, R2, D1)' },
    { id: 'mcp-cf-obs',      name: 'CF Obs',      category: 'devops',   tools: ['list_logs', 'get_metrics'],                           color: '#f6821f', letter: 'CO', description: 'Cloudflare observability and logs' },
    { id: 'mcp-clickhouse',  name: 'ClickHouse',  category: 'data',     tools: ['query', 'list_databases', 'list_tables'],              color: '#ffcc00', letter: 'CH', description: 'ClickHouse analytics queries' },
    { id: 'mcp-vercel',      name: 'Vercel',      category: 'devops',   tools: ['list_projects', 'deploy', 'get_deployment'],          color: '#000',    letter: 'VC', description: 'Vercel deployments and projects' },
    { id: 'mcp-qdrant',      name: 'Qdrant',      category: 'memory',   tools: ['store', 'find', 'delete', 'list_collections'],        color: '#10b981', letter: 'QD', description: 'Vector database for semantic search (1.4k stars)' },
    { id: 'mcp-filesystem',  name: 'Filesystem',  category: 'files',    tools: ['read_file', 'write_file', 'list_directory', 'search'],color: '#8b5cf6', letter: 'FS', description: 'File system operations via R2 storage' },
    { id: 'mcp-memory',      name: 'Memory',      category: 'memory',   tools: ['entities', 'relations', 'observations', 'search'],    color: '#06b6d4', letter: 'MG', description: 'Persistent knowledge graph memory' },
    { id: 'mcp-fetch',       name: 'Fetch',       category: 'research', tools: ['fetch_url'],                                          color: '#14b8a6', letter: 'FT', description: 'URL to clean markdown extraction' },
    { id: 'mcp-git',         name: 'Git',         category: 'devops',   tools: ['log', 'diff', 'blame', 'status'],                    color: '#f97316', letter: 'GT', description: 'Git operations (8k stars)' },
    { id: 'mcp-seqthink',    name: 'Seq. Think',  category: 'thinking', tools: ['sequential_thinking'],                                 color: '#a855f7', letter: 'ST', description: 'Structured reasoning chains (81k stars)' },
    { id: 'mcp-cognee',      name: 'Cognee',      category: 'memory',   tools: ['remember', 'recall', 'forget'],                       color: '#ec4899', letter: 'CG', description: 'AI memory platform with knowledge graphs (6.5k stars)' },
    { id: 'mcp-serena',      name: 'Serena',      category: 'code',     tools: ['search_code', 'edit_code', 'find_references'],         color: '#3b82f6', letter: 'SR', description: 'Semantic code editing agent (22k stars)' },
  ];

  var CATEGORIES = {
    docs:     { label: 'Docs',     color: '#6366f1' },
    devops:   { label: 'DevOps',   color: '#f6821f' },
    design:   { label: 'Design',   color: '#f59e0b' },
    research: { label: 'Research', color: '#ef4444' },
    data:     { label: 'Data',     color: '#ffcc00' },
    memory:   { label: 'Memory',   color: '#10b981' },
    files:    { label: 'Files',    color: '#8b5cf6' },
    thinking: { label: 'Thinking', color: '#a855f7' },
    code:     { label: 'Code',     color: '#3b82f6' },
  };

  function getAll() { return MCPAGENTS.slice(); }

  function getByCategory(cat) {
    if (!cat || cat === 'all') return MCPAGENTS.slice();
    return MCPAGENTS.filter(function(a) { return a.category === cat; });
  }

  function getById(id) {
    return MCPAGENTS.find(function(a) { return a.id === id; });
  }

  function getCategories() {
    return Object.keys(CATEGORIES).map(function(k) {
      return { id: k, label: CATEGORIES[k].label, color: CATEGORIES[k].color, count: MCPAGENTS.filter(function(a) { return a.category === k; }).length };
    });
  }

  function getAgentSystemPrompt(agentId) {
    var agent = getById(agentId);
    if (!agent) return '';
    var cat = CATEGORIES[agent.category] || {};
    var lines = [
      '== MCP AGENT: ' + agent.name.toUpperCase() + ' ==',
      'Category: ' + (cat.label || agent.category),
      'Description: ' + agent.description,
      'Available tools: ' + agent.tools.join(', '),
      '',
      'You are the ' + agent.name + ' MCP Agent. Use your tools to help the user.',
      'Always call the appropriate tool for the task.',
      'Return results in a clear, structured format.',
    ];
    return lines.join('\n');
  }

  function matchAgentForQuery(query) {
    if (!query) return null;
    var q = query.toLowerCase();
    var matches = [];
    MCPAGENTS.forEach(function(a) {
      var score = 0;
      if (a.category === 'docs' && /documentacion|docs|libreria|framework|api reference|como usar/.test(q)) score += 3;
      if (a.category === 'devops' && /deploy|build|worker|cloudflare|vercel|git|branch|commit|pr|pull request/.test(q)) score += 3;
      if (a.category === 'design' && /theme|design|diseñ|color|typography|ui|ux/.test(q)) score += 3;
      if (a.category === 'research' && /scrape|crawl|web|url|fetch|extraer|contenido/.test(q)) score += 3;
      if (a.category === 'data' && /query|sql|analytics|data|datos|tabla|database/.test(q)) score += 3;
      if (a.category === 'memory' && /memoria|recordar|remember|knowledge|graph|vector/.test(q)) score += 3;
      if (a.category === 'files' && /archivo|file|leer|escribir|folder|directory/.test(q)) score += 3;
      if (a.category === 'thinking' && /pensar|razonar|think|analizar|reason|complex/.test(q)) score += 3;
      if (a.category === 'code' && /code|codigo|editar|edit|search code|find reference/.test(q)) score += 3;
      if (a.tools.some(function(t) { return q.indexOf(t) !== -1; })) score += 5;
      if (a.name.toLowerCase().split(' ').some(function(w) { return q.indexOf(w) !== -1; })) score += 2;
      if (score > 0) matches.push({ agent: a, score: score });
    });
    matches.sort(function(a, b) { return b.score - a.score; });
    return matches.length ? matches[0].agent : null;
  }

  return {
    getAll: getAll,
    getByCategory: getByCategory,
    getById: getById,
    getCategories: getCategories,
    getAgentSystemPrompt: getAgentSystemPrompt,
    matchAgentForQuery: matchAgentForQuery,
    MCPAGENTS: MCPAGENTS,
    CATEGORIES: CATEGORIES
  };
})();
