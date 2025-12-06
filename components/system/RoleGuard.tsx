"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkRoleAccess } from "@/lib/middleware/roleGuard";

/**
 * Role Guard Component
 * Her sayfa için rol bazlı erişim kontrolü yapar
 * 
 * @param allowedRoles - Bu sayfaya erişebilecek roller
 * @param children - Korunacak içerik
 */
export function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: string[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      const currentPath = window.location.pathname;
      const result = await checkRoleAccess(currentPath);

      if (!result.authorized) {
        if (result.redirectTo) {
          router.push(result.redirectTo);
        }
        return;
      }

      // Eğer specific roller belirtilmişse, kontrol et
      if (allowedRoles.length > 0 && result.userRole) {
        if (!allowedRoles.includes(result.userRole)) {
          router.push("/access-denied");
          return;
        }
      }

      setIsAuthorized(true);
      setLoading(false);
    };

    checkAccess();
  }, [router, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
