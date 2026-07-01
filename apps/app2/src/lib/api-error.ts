import { NextResponse } from 'next/server';

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Internal server error';
}

export function apiErrorResponse(error: unknown, logLabel: string) {
  const message = getErrorMessage(error);

  if (message === 'Unauthorized' || message === 'Forbidden') {
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 403 });
  }

  console.error(logLabel, error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
