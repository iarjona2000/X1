/**
 * Tests del dispatch por nivel de integración (spec §10).
 */

import { dispatchToAgent, AgentDispatchError } from '../../core/orchestration/vault/dispatch.js';

const ctx = { prompt: 'haz algo' };

describe('dispatchToAgent — enrutado por nivel', () => {
  test('nivel 1 → X1MCPClient.callTool', async () => {
    const mcpClient = { callTool: jest.fn(async () => ({ result: 'mcp-ok' })) };
    const res = await dispatchToAgent({ integrationLevel: 1, integrationRef: 'oc-mcp' }, ctx, { mcpClient });
    expect(mcpClient.callTool).toHaveBeenCalledWith('oc-mcp', ctx);
    expect(res.ok).toBe(true);
    expect(res.data.result).toBe('mcp-ok');
  });

  test('nivel 2 → wrapper de API', async () => {
    const apiClient = jest.fn(async () => ({ result: 'api-ok' }));
    const res = await dispatchToAgent({ integrationLevel: 2, integrationRef: 'cfo-api' }, ctx, { apiClient });
    expect(apiClient).toHaveBeenCalledWith('cfo-api', ctx);
    expect(res.data.result).toBe('api-ok');
  });

  test('nivel 3 → mismo wrapper de API', async () => {
    const apiClient = jest.fn(async () => 'saas-ok');
    const res = await dispatchToAgent({ integrationLevel: 3, integrationRef: 'saas' }, ctx, { apiClient });
    expect(res.data).toBe('saas-ok');
  });

  test('nivel 4 → X1PluginEngine.executePlugin (preferente)', async () => {
    const pluginEngine = { executePlugin: jest.fn(async () => 'plugin-ok') };
    const agentManager = { callAgent: jest.fn() };
    const res = await dispatchToAgent({ integrationLevel: 4, integrationRef: 'seo-plugin' }, ctx, { pluginEngine, agentManager });
    expect(pluginEngine.executePlugin).toHaveBeenCalled();
    expect(agentManager.callAgent).not.toHaveBeenCalled();
    expect(res.data).toBe('plugin-ok');
  });

  test('nivel 4 → cae a X1AgentManager.callAgent si no hay pluginEngine', async () => {
    const agentManager = { callAgent: jest.fn(async () => 'agent-ok') };
    const res = await dispatchToAgent({ integrationLevel: 4, integrationRef: 'x' }, ctx, { agentManager });
    expect(res.data).toBe('agent-ok');
  });
});

describe('dispatchToAgent — errores normalizados (AgentDispatchError)', () => {
  test('sin integration_ref lanza AgentDispatchError no reintentable', async () => {
    await expect(dispatchToAgent({ integrationLevel: 1 }, ctx, {})).rejects.toBeInstanceOf(AgentDispatchError);
  });

  test('cliente ausente para el nivel → AgentDispatchError', async () => {
    await expect(dispatchToAgent({ integrationLevel: 1, integrationRef: 'x' }, ctx, {})).rejects.toMatchObject({ integrationLevel: 1, retryable: false });
  });

  test('fallo de red del cliente se marca reintentable', async () => {
    const mcpClient = { callTool: async () => { throw new Error('network timeout'); } };
    try {
      await dispatchToAgent({ integrationLevel: 1, integrationRef: 'x' }, ctx, { mcpClient });
      throw new Error('debería haber lanzado');
    } catch (e) {
      expect(e).toBeInstanceOf(AgentDispatchError);
      expect(e.retryable).toBe(true);
      expect(e.integrationRef).toBe('x');
    }
  });

  test('fallo no-red del cliente no es reintentable por defecto', async () => {
    const apiClient = async () => { throw new Error('validación falló'); };
    try {
      await dispatchToAgent({ integrationLevel: 2, integrationRef: 'x' }, ctx, { apiClient });
    } catch (e) {
      expect(e.retryable).toBe(false);
    }
  });

  test('nivel desconocido lanza AgentDispatchError', async () => {
    await expect(dispatchToAgent({ integrationLevel: 9, integrationRef: 'x' }, ctx, {})).rejects.toBeInstanceOf(AgentDispatchError);
  });
});
