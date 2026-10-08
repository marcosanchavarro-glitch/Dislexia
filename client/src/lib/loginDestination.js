const editorialRoles = new Set(['EDITOR', 'ADMIN', 'SUPER_ADMIN']);
export function loginDestination(user, requested) {
  if (typeof requested === 'string' && requested.startsWith('/resena/')) return requested;
  if (editorialRoles.has(user?.role)) {
    if (
      typeof requested === 'string' &&
      (requested === '/admin' || requested.startsWith('/admin/'))
    )
      return requested;
    return '/admin';
  }
  return '/';
}
