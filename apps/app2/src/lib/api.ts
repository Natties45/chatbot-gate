const APP_BASE_PATH = '/app2';

export function apiUrl(path: string): string {
  if (path.startsWith(APP_BASE_PATH)) return path;
  return `${APP_BASE_PATH}${path}`;
}
