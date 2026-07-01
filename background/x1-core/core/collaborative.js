/**
 * Agentes colaborativos: equipos con nombre.
 *
 * Capa de alto nivel sobre Supervisor que permite definir "equipos"
 * persistentes (conjuntos de agentes con un rol común) y lanzarlos sobre una
 * tarea. Guarda el historial de colaboración para que el usuario pueda revisar
 * el proceso paso a paso.
 */

import { Supervisor } from './orchestration/supervisor.js';
import { ids } from '../utils/id.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import Logger from './logger.js';

const logger = new Logger('Collaborative');
const TEAMS_KEY = 'x1_teams';
const RUNS_KEY = 'x1_team_runs';

export class CollaborativeEngine {
  /**
   * @param {Object} deps
   * @param {{get:Function, set:Function}} deps.store
   * @param {import('./agents/agent-manager.js').AgentManager} deps.agentManager
   */
  constructor(deps) {
    this.store = deps.store;
    this.agentManager = deps.agentManager;
    this.supervisor = new Supervisor({ agentManager: deps.agentManager });
  }

  /**
   * Crea un equipo con nombre.
   * @param {Object} params
   * @param {string} params.name
   * @param {string} params.description
   * @param {string[]} params.agentIds
   * @returns {Promise<Object>}
   */
  async createTeam({ name, description, agentIds }) {
    if (!agentIds?.length) throw new ValidationError('Un equipo necesita al menos un agente');
    // Validar que los agentes existen
    for (const id of agentIds) await this.agentManager.get(id);

    const team = {
      id: ids.prefixedId?.('team') || `team_${Date.now()}`,
      name,
      description: description || '',
      agentIds,
      createdAt: new Date().toISOString()
    };
    const teams = await this.listTeams();
    teams.push(team);
    await this.store.set(TEAMS_KEY, teams);
    logger.info(`Equipo creado: ${name} (${agentIds.length} agentes)`);
    return team;
  }

  /**
   * Lista los equipos.
   * @returns {Promise<Array>}
   */
  async listTeams() {
    return (await this.store.get(TEAMS_KEY)) || [];
  }

  /**
   * Obtiene un equipo.
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getTeam(id) {
    const team = (await this.listTeams()).find((t) => t.id === id);
    if (!team) throw new NotFoundError(`Equipo no encontrado: ${id}`);
    return team;
  }

  /**
   * Lanza un equipo sobre una tarea y guarda el registro de colaboración.
   * @param {string} teamId
   * @param {string} goal
   * @param {Object} [options]
   * @returns {Promise<{runId:string, result:string, transcript:Array}>}
   */
  async runTeam(teamId, goal, options = {}) {
    const team = await this.getTeam(teamId);
    logger.info(`Lanzando equipo "${team.name}" sobre: ${goal.slice(0, 60)}`);

    const solution = await this.supervisor.solve(
      { goal, agentIds: team.agentIds },
      options
    );

    const run = {
      id: ids.run(),
      teamId,
      teamName: team.name,
      goal,
      result: solution.result,
      transcript: solution.transcript,
      rounds: solution.rounds,
      createdAt: new Date().toISOString()
    };
    await this._saveRun(run);
    return run;
  }

  /**
   * Lanza una colaboración ad-hoc sin equipo persistente.
   * @param {string[]} agentIds
   * @param {string} goal
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async runAdHoc(agentIds, goal, options = {}) {
    const solution = await this.supervisor.solve({ goal, agentIds }, options);
    const run = {
      id: ids.run(),
      teamId: null,
      teamName: 'Ad-hoc',
      goal,
      result: solution.result,
      transcript: solution.transcript,
      rounds: solution.rounds,
      createdAt: new Date().toISOString()
    };
    await this._saveRun(run);
    return run;
  }

  /**
   * Recupera el historial de ejecuciones de equipos.
   * @param {number} [limit=20]
   * @returns {Promise<Array>}
   */
  async listRuns(limit = 20) {
    const runs = (await this.store.get(RUNS_KEY)) || [];
    return runs.slice(-limit).reverse();
  }

  /**
   * Elimina un equipo.
   * @param {string} id
   * @returns {Promise<void>}
   */
  async deleteTeam(id) {
    const teams = await this.listTeams();
    await this.store.set(TEAMS_KEY, teams.filter((t) => t.id !== id));
  }

  /** @private */
  async _saveRun(run) {
    const runs = (await this.store.get(RUNS_KEY)) || [];
    runs.push(run);
    if (runs.length > 100) runs.splice(0, runs.length - 100);
    await this.store.set(RUNS_KEY, runs);
  }
}

export default CollaborativeEngine;
