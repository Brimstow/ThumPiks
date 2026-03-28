/**
 * Admin Route Generator
 *
 * Function (not component) that reads the admin module registry
 * and returns React Router v6 <Route> elements with permission
 * wrappers and lazy loading.
 *
 * Must be a function returning ReactNode[] because React Router v6
 * requires <Route> elements as direct children of a parent <Route>.
 */

import React, { Suspense } from 'react';
import { Route } from 'react-router-dom';
import AdminProtectedRoute from '../../../components/admin/AdminProtectedRoute';
import { adminModules } from '../registry';

/**
 * Loading spinner shown while lazy-loaded admin pages are being fetched.
 */
function AdminPageLoader() {
  return (
    <div className="flex h-full items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#2563ff] border-t-transparent" />
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Joins a module basePath with a route sub-path.
 * Handles edge cases where either part may be empty.
 */
function joinPath(basePath: string, subPath: string): string {
  if (!basePath && !subPath) return '';
  if (!basePath) return subPath;
  if (!subPath) return basePath;
  return `${basePath}/${subPath}`;
}

/**
 * Generates all admin <Route> elements from the module registry.
 * Call this inside the /admin parent Route in App.tsx:
 *
 * ```tsx
 * <Route path="/admin" element={...}>
 *   {renderAdminRoutes()}
 * </Route>
 * ```
 */
export function renderAdminRoutes(): React.ReactNode[] {
  return adminModules.flatMap(mod =>
    mod.routes.map(route => {
      const Component = route.component;
      const element = (
        <Suspense fallback={<AdminPageLoader />}>
          <Component />
        </Suspense>
      );

      const wrapped = route.permission
        ? (
          <AdminProtectedRoute requiredPermissions={[route.permission]}>
            {element}
          </AdminProtectedRoute>
        )
        : element;

      if (route.index && !mod.basePath) {
        // Only use a true index route when the module sits at the parent path
        return <Route key={`${mod.id}-index`} index element={wrapped} />;
      }

      const fullPath = joinPath(mod.basePath, route.path);
      return <Route key={`${mod.id}-${fullPath || 'index'}`} path={fullPath} element={wrapped} />;
    })
  );
}
