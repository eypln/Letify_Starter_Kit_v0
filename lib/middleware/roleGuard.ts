/**
 * Role-Based Access Control (RBAC) Guard
 * 
 * Bu middleware, kullanıcının rolüne göre sayfalara erişim kontrolü sağlar.
 * Her rol sadece kendine ait dashboard'a erişebilir.
 */

import { createClient } from '@/lib/supabase/client';

export type UserRole = 'agent' | 'teamleader' | 'manager' | 'boss' | 'admin';

/**
 * Rol bazlı route mapping
 * Her rol için izin verilen base path
 */
export const ROLE_ROUTES: Record<UserRole, string> = {
  agent: '/dashboard',
  teamleader: '/teamleader',
  manager: '/manager',
  boss: '/boss',
  admin: '/admin'
};

/**
 * Kullanıcının mevcut rotaya erişim yetkisi olup olmadığını kontrol eder
 * 
 * @param userRole - Kullanıcının rolü
 * @param currentPath - Mevcut sayfa yolu
 * @returns Erişim izni var mı?
 */
export function hasAccess(userRole: UserRole, currentPath: string): boolean {
  const allowedPath = ROLE_ROUTES[userRole];
  
  // Admin tüm sayfalara erişebilir
  if (userRole === 'admin') {
    return true;
  }
  
  // Shared pages: tüm roller erişebilir
  const sharedPaths = [
    '/dashboard/profile',
    '/dashboard/new-post',
    '/dashboard/clients',
    '/dashboard/listings',
    '/dashboard/teamwork',
    '/dashboard/viewings',
    '/dashboard/revenue',
    '/dashboard/analytics'
  ];
  
  if (sharedPaths.some(path => currentPath.startsWith(path))) {
    return true;
  }
  
  // Role-specific dashboard: sadece ilgili rol erişebilir
  return currentPath.startsWith(allowedPath);
}

/**
 * Kullanıcının rolünü ve erişim yetkisini kontrol eder
 * Yetkisiz erişim durumunda uygun sayfaya yönlendirir
 * 
 * @returns {Promise<{authorized: boolean, userRole: UserRole | null, redirectTo: string | null}>}
 */
export async function checkRoleAccess(currentPath: string): Promise<{
  authorized: boolean;
  userRole: UserRole | null;
  redirectTo: string | null;
}> {
  const supabase = createClient();
  
  // Kullanıcı oturum kontrolü
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return {
      authorized: false,
      userRole: null,
      redirectTo: '/sign-in'
    };
  }
  
  // Kullanıcının rolünü al
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (!profile || !profile.role) {
    return {
      authorized: false,
      userRole: null,
      redirectTo: '/waiting-approval'
    };
  }
  
  const userRole = profile.role as UserRole;
  
  // Erişim kontrolü
  const authorized = hasAccess(userRole, currentPath);
  
  if (!authorized) {
    // Yetkisiz erişim - kullanıcıyı kendi dashboard'ına yönlendir
    return {
      authorized: false,
      userRole,
      redirectTo: '/access-denied'
    };
  }
  
  return {
    authorized: true,
    userRole,
    redirectTo: null
  };
}

/**
 * Kullanıcının rolüne göre doğru dashboard URL'ini döndürür
 * 
 * @param userRole - Kullanıcının rolü
 * @returns Dashboard URL
 */
export function getDashboardUrl(userRole: UserRole): string {
  return ROLE_ROUTES[userRole] || '/dashboard';
}
