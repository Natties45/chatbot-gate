export interface OperationProgress {
  step: number;
  total: number;
  label: string;
  status: 'idle' | 'running' | 'done' | 'error';
  updatedAt: string;
}

const progressBySession = new Map<string, OperationProgress>();

export function setOperationProgress(sessionId: string, progress: Omit<OperationProgress, 'updatedAt'>) {
  progressBySession.set(sessionId, { ...progress, updatedAt: new Date().toISOString() });
}

export function getOperationProgress(sessionId: string): OperationProgress {
  return progressBySession.get(sessionId) || {
    step: 0,
    total: 3,
    label: 'Idle',
    status: 'idle',
    updatedAt: new Date().toISOString(),
  };
}
