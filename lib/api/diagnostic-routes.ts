export function isDiagnosticRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/api/debug/') ||
    pathname.startsWith('/api/test-') ||
    pathname === '/api/add-test-credits' ||
    pathname === '/api/notifications/debug'
  );
}
