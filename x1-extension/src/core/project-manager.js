/**
 * Jefe de proyectos autónomo.
 *
 * Desglosa un objetivo de proyecto en tareas con dependencias, plazos y
 * responsables sugeridos; persiste el plan; monitorea el progreso; y genera
 * reportes y alertas de retraso. La descomposición usa el modelo; el
 * seguimiento es determinista sobre el estado persistido.
 */

import { registry } from './providers/index.js';
import { parseLooseJson } from '../utils/text.js';
import { ids } from '../utils/id.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import Logger from './logger.js';

const logger = new Logger('ProjectManager');
const STORAGE_KEY = 'x1_projects';

/** Estados posibles de una tarea. */
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  BLOCKED: 'blocked',
  DONE: 'done'
};

export class ProjectManager {
  /**
   * @param {Object} deps
   * @param {{get:Function, set:Function}} deps.store
   * @param {string} [deps.model='gpt-4o-mini']
   */
  constructor(deps) {
    this.store = deps.store;
    this.model = deps.model || 'gpt-4o-mini';
  }

  /**
   * Crea un proyecto desglosando el objetivo en tareas.
   * @param {Object} params
   * @param {string} params.name
   * @param {string} params.goal
   * @param {number} [params.deadlineDays=14]
   * @returns {Promise<Object>} proyecto persistido
   */
  async createProject({ name, goal, deadlineDays = 14 }) {
    if (!goal) throw new ValidationError('El proyecto necesita un objetivo');
    const tasks = await this._decompose(goal, deadlineDays);

    const project = {
      id: ids.project(),
      name: name || goal.slice(0, 40),
      goal,
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + deadlineDays * 86400000).toISOString(),
      status: 'active',
      tasks
    };

    const projects = await this.list();
    projects.push(project);
    await this._persist(projects);
    logger.info(`Proyecto creado: ${project.name} con ${tasks.length} tareas`);
    return project;
  }

  /**
   * Descompone un objetivo en tareas usando el modelo.
   * @param {string} goal
   * @param {number} deadlineDays
   * @returns {Promise<Array>}
   * @private
   */
  async _decompose(goal, deadlineDays) {
    const provider = registry.forModel(this.model);
    const completion = await provider.complete(this.model, [
      {
        role: 'system',
        content:
          'Eres un jefe de proyectos experto. Desglosa un objetivo en 4-10 tareas accionables con dependencias. ' +
          'Devuelve SOLO JSON: {"tasks":[{"title":"...","description":"...","estimateDays":N,"dependsOn":[índices],"role":"..."}]}. ' +
          'Los índices de dependencia refieren a la posición (0-based) de otras tareas.'
      },
      {
        role: 'user',
        content: `OBJETIVO: ${goal}\nPLAZO TOTAL: ${deadlineDays} días.\nDesglosa el proyecto.`
      }
    ], { temperature: 0.3, maxTokens: 1200, responseFormat: { type: 'json_object' } });

    const parsed = parseLooseJson(completion.text);
    const rawTasks = parsed?.tasks || [];

    // Asignar ids y fechas planificadas respetando dependencias (topológico simple)
    let cursor = Date.now();
    return rawTasks.map((t, i) => {
      const estimateDays = t.estimateDays || 2;
      const start = cursor;
      const end = start + estimateDays * 86400000;
      cursor = end;
      return {
        id: ids.task(),
        index: i,
        title: t.title || `Tarea ${i + 1}`,
        description: t.description || '',
        role: t.role || 'General',
        estimateDays,
        dependsOn: (t.dependsOn || []).filter((d) => typeof d === 'number'),
        status: TASK_STATUS.PENDING,
        plannedStart: new Date(start).toISOString(),
        plannedEnd: new Date(end).toISOString(),
        completedAt: null
      };
    });
  }

  /**
   * Lista todos los proyectos.
   * @returns {Promise<Array>}
   */
  async list() {
    return (await this.store.get(STORAGE_KEY)) || [];
  }

  /**
   * Obtiene un proyecto por id.
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async get(id) {
    const project = (await this.list()).find((p) => p.id === id);
    if (!project) throw new NotFoundError(`Proyecto no encontrado: ${id}`);
    return project;
  }

  /**
   * Actualiza el estado de una tarea y recalcula bloqueos.
   * @param {string} projectId
   * @param {string} taskId
   * @param {string} status
   * @returns {Promise<Object>} proyecto actualizado
   */
  async updateTask(projectId, taskId, status) {
    const projects = await this.list();
    const project = projects.find((p) => p.id === projectId);
    if (!project) throw new NotFoundError(`Proyecto no encontrado: ${projectId}`);

    const task = project.tasks.find((t) => t.id === taskId);
    if (!task) throw new NotFoundError(`Tarea no encontrada: ${taskId}`);

    task.status = status;
    if (status === TASK_STATUS.DONE) task.completedAt = new Date().toISOString();

    this._recomputeBlocks(project);
    project.status = project.tasks.every((t) => t.status === TASK_STATUS.DONE)
      ? 'completed'
      : 'active';

    await this._persist(projects);
    return project;
  }

  /**
   * Recalcula qué tareas están bloqueadas por dependencias no completadas.
   * @param {Object} project
   * @private
   */
  _recomputeBlocks(project) {
    const byIndex = new Map(project.tasks.map((t) => [t.index, t]));
    for (const task of project.tasks) {
      if (task.status === TASK_STATUS.DONE || task.status === TASK_STATUS.IN_PROGRESS) continue;
      const blocked = task.dependsOn.some((dep) => {
        const depTask = byIndex.get(dep);
        return depTask && depTask.status !== TASK_STATUS.DONE;
      });
      task.status = blocked ? TASK_STATUS.BLOCKED : TASK_STATUS.PENDING;
    }
  }

  /**
   * Genera un reporte de estado del proyecto.
   * @param {string} projectId
   * @returns {Promise<Object>}
   */
  async report(projectId) {
    const project = await this.get(projectId);
    const total = project.tasks.length;
    const done = project.tasks.filter((t) => t.status === TASK_STATUS.DONE).length;
    const inProgress = project.tasks.filter((t) => t.status === TASK_STATUS.IN_PROGRESS).length;
    const blocked = project.tasks.filter((t) => t.status === TASK_STATUS.BLOCKED).length;

    const now = Date.now();
    const overdue = project.tasks.filter(
      (t) => t.status !== TASK_STATUS.DONE && Date.parse(t.plannedEnd) < now
    );

    const nextActions = project.tasks
      .filter((t) => t.status === TASK_STATUS.PENDING)
      .slice(0, 3);

    return {
      project: project.name,
      progress: total ? Math.round((done / total) * 100) : 0,
      counts: { total, done, inProgress, blocked, pending: total - done - inProgress - blocked },
      overdue: overdue.map((t) => ({ title: t.title, plannedEnd: t.plannedEnd })),
      nextActions: nextActions.map((t) => t.title),
      onTrack: overdue.length === 0
    };
  }

  /**
   * Detecta tareas retrasadas en todos los proyectos activos (para alertas).
   * @returns {Promise<Array<{project:string, task:string, daysLate:number}>>}
   */
  async detectDelays() {
    const projects = await this.list();
    const now = Date.now();
    const alerts = [];
    for (const project of projects) {
      if (project.status !== 'active') continue;
      for (const task of project.tasks) {
        if (task.status !== TASK_STATUS.DONE && Date.parse(task.plannedEnd) < now) {
          alerts.push({
            project: project.name,
            task: task.title,
            daysLate: Math.ceil((now - Date.parse(task.plannedEnd)) / 86400000)
          });
        }
      }
    }
    return alerts;
  }

  /**
   * Elimina un proyecto.
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    const projects = await this.list();
    await this._persist(projects.filter((p) => p.id !== id));
  }

  /** @private */
  async _persist(projects) {
    await this.store.set(STORAGE_KEY, projects);
  }
}

export default ProjectManager;
