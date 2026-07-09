import * as React from 'react';
import { cn } from '../../lib/utils';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './collapsible';

function ChevronDown({ className }) {
  return <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" className={className}><path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/></svg>;
}

function FileIcon({ className }) {
  return <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" className={className}><path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75zm1.75-.25a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 00.25-.25V6h-2.75A1.75 1.75 0 019 4.25V1.5H3.75zm6.75.062V4.25c0 .138.112.25.25.25h2.688a.252.252 0 00-.011-.013l-2.914-2.914a.272.272 0 00-.013-.011z"/></svg>;
}

function CheckIcon({ className }) {
  return <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" className={className}><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>;
}

function XIcon({ className }) {
  return <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" className={className}><path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/></svg>;
}

function Spinner({ className }) {
  return <svg viewBox="0 0 16 16" width="13" height="13" className={cn('animate-spin', className)}><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25"/><path d="M8 2a6 6 0 016 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}

function ClockIcon({ className }) {
  return <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" className={className}><path d="M8 0a8 8 0 110 16A8 8 0 018 0zM1.5 8a6.5 6.5 0 1013 0 6.5 6.5 0 00-13 0zm6.25-3.25v2.992l2.028.812a.75.75 0 01-.557 1.392l-2.5-1A.751.751 0 017.25 8.25v-3.5a.75.75 0 011.5 0z"/></svg>;
}

function BrainIcon({ className }) {
  return <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" className={className}><path d="M4.5 0C6.067 0 7.418.844 8 2.126A3.502 3.502 0 0110.5 0c1.93 0 3.5 1.57 3.5 3.5 0 .935-.37 1.785-.973 2.414.602.629.973 1.48.973 2.414 0 1.93-1.57 3.5-3.5 3.5-1.36 0-2.54-.78-3.094-1.91a.75.75 0 00-1.361.093A3.512 3.512 0 012.5 11.828C.57 11.828-1 10.258-1 8.328c0-.934.37-1.785.973-2.414A3.483 3.483 0 010 3.5 3.498 3.498 0 013.5 0c.352 0 .688.052 1 .148A3.502 3.502 0 014.5 0z"/></svg>;
}

function CodeSnippet({ code, language }) {
  if (!code) return null;
  return <pre className="mt-2 text-xs font-mono whitespace-pre-wrap break-all bg-gray-100 border border-gray-300 p-2.5 rounded-lg max-h-48 overflow-auto text-gray-900 leading-relaxed">{code}</pre>;
}

function FileBadge({ path, added, removed, isNew }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-gray-400 bg-white text-xs font-mono text-gray-1000">
      <FileIcon className="text-gray-700 flex-shrink-0" />
      <span className="truncate max-w-48">{path}</span>
      {isNew && <span className="text-gray-600 font-medium ml-1">+ nuevo</span>}
      {typeof added === 'number' && added > 0 && <span className="text-green-700 font-medium ml-1">+{added}</span>}
      {typeof removed === 'number' && removed > 0 && <span className="text-red-700 font-medium ml-1">-{removed}</span>}
    </div>
  );
}

function StepFiles({ files }) {
  if (!files || !files.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {files.map((f) => <FileBadge key={f.path} path={f.path} added={f.added} removed={f.removed} isNew={f.isNew} />)}
    </div>
  );
}

function LiveElapsed({ startedAt }) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  if (!startedAt) return null;
  const secs = Math.max(0, Math.round((now - startedAt) / 1000));
  return <span className="text-xs text-gray-700 font-medium">{secs}s</span>;
}

function StepRow({ step, isLast }) {
  const status = step.status;
  const isActive = status === 'active';
  const isDone = status === 'done';
  const isError = status === 'error';
  const hasFiles = step.files && step.files.length > 0;
  const hasCode = !!step.code;
  const hasSubsteps = step.substeps && step.substeps.length > 0;
  const elapsed = isDone && step.finishedAt && step.startedAt ? Math.round((step.finishedAt - step.startedAt) / 1000) : null;

  return (
    <div className={cn('flex gap-3', !isLast && 'pb-3')}>
      <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
        <div className="flex items-center justify-center w-4 h-4">
          {isActive ? <Spinner className="text-gray-1000" />
            : isError ? <XIcon className="text-gray-1000" />
            : isDone ? <CheckIcon className="text-gray-1000" />
            : <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
        </div>
        {!isLast && <div className="w-px flex-1 bg-gray-300 mt-1" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center flex-wrap gap-x-2">
          <span className={cn('text-sm', isError ? 'text-gray-1000 font-medium' : isActive ? 'text-gray-1000 font-medium' : 'text-gray-900')}>
            {step.description}
          </span>
          {isActive && step.startedAt && <LiveElapsed startedAt={step.startedAt} />}
          {elapsed != null && elapsed > 0 && <span className="text-xs text-gray-600">{elapsed}s</span>}
        </div>
        {step.sub && <p className="text-sm text-gray-700 mt-0.5">{step.sub}</p>}

        {step.details && (
          <pre className="mt-2 text-xs text-gray-700 font-mono whitespace-pre-wrap break-all bg-gray-100 border border-gray-300 p-2.5 rounded-lg max-h-32 overflow-auto">{step.details}</pre>
        )}

        {hasFiles && <StepFiles files={step.files} />}
        {hasCode && <CodeSnippet code={step.code} />}

        {hasSubsteps && (
          <div className="mt-2 ml-2 pl-2 border-l-2 border-gray-300">
            {step.substeps.map((ss, i) => (
              <div key={ss.id ?? i} className="flex items-start gap-2 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                <div>
                  <span className="text-xs text-gray-900">{ss.description}</span>
                  {ss.code && <CodeSnippet code={ss.code} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskItem({ children, className }) {
  return <div className={cn('text-sm text-gray-900', className)}>{children}</div>;
}

export function Task({ defaultOpen = true, className, children }) {
  return (
    <Collapsible defaultOpen={defaultOpen} className={cn('data-[state=closed]:animate-slideOut data-[state=open]:animate-slideIn', className)}>
      {children}
    </Collapsible>
  );
}

export function TaskTrigger({ children, className, title }) {
  return (
    <CollapsibleTrigger asChild className={cn('group', className)}>
      {children ?? (
        <div className="flex items-center gap-2 text-gray-900 cursor-pointer hover:text-gray-1000 select-none">
          <p className="text-sm font-medium">{title}</p>
          <ChevronDown className="w-3.5 h-3.5 transition-transform group-data-[state=open]:rotate-180" />
        </div>
      )}
    </CollapsibleTrigger>
  );
}

export function TaskContent({ children, className }) {
  return (
    <CollapsibleContent className={cn('outline-none data-[state=open]:animate-slideIn data-[state=closed]:animate-slideOut', className)}>
      {children}
    </CollapsibleContent>
  );
}

export function ProcessTask({ steps, isRunning, title }) {
  if (!steps || !steps.length) return null;

  const hasErrors = steps.some((s) => s.status === 'error');
  const first = steps.find((s) => s.startedAt);
  const last = steps.slice().reverse().find((s) => s.finishedAt);
  const totalSeconds = first && last ? Math.max(0, Math.round((last.finishedAt - first.startedAt) / 1000)) : null;

  const triggerLabel = isRunning
    ? 'Trabajando…'
    : hasErrors
    ? 'Trabajo interrumpido por un error'
    : totalSeconds != null
    ? 'Trabajado durante ' + totalSeconds + 's'
    : (title || 'Procedimiento');

  return (
    <Task defaultOpen={isRunning || hasErrors} className="w-full">
      <TaskTrigger>
        <CollapsibleTrigger asChild className="group">
          <div className="flex items-center gap-2 text-gray-700 cursor-pointer hover:text-gray-1000 select-none py-1">
            {isRunning ? <Spinner /> : hasErrors ? <XIcon /> : <ClockIcon />}
            <p className="text-sm">{triggerLabel}</p>
            <ChevronDown className="w-3.5 h-3.5 transition-transform group-data-[state=open]:rotate-180" />
          </div>
        </CollapsibleTrigger>
      </TaskTrigger>
      <TaskContent>
        <div className="mt-2 pl-0.5">
          {steps.map((step, i) => (
            <StepRow key={step.id ?? i} step={step} isLast={i === steps.length - 1} />
          ))}
        </div>
      </TaskContent>
    </Task>
  );
}

export function ThinkingStep({ description, substeps, isActive, startedAt, files, code }) {
  return (
    <StepRow step={{ id: 'think', status: isActive ? 'active' : 'done', description, startedAt, files, code, substeps }} isLast={false} />
  );
}

export function FileChange({ path, added, removed, isNew, code }) {
  return (
    <div className="flex flex-col gap-1.5 mb-2">
      <FileBadge path={path} added={added} removed={removed} isNew={isNew} />
      {code && <CodeSnippet code={code} />}
    </div>
  );
}

export default ProcessTask;
