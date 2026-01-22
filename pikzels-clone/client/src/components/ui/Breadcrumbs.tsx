import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import './Breadcrumbs.css';

interface BreadcrumbItem {
  label: string;
  path: string;
}

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const params = useParams();

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', path: '/dashboard' }
    ];

    if (pathSegments.length === 0 || pathSegments[0] === 'dashboard') {
      return breadcrumbs;
    }

    let currentPath = '';
    
    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      currentPath += `/${segment}`;

      // Skip ID segments and 'edit' in the breadcrumb display
      if (segment.match(/^[a-f0-9-]{20,}$/i)) {
        // This is likely an ID, get a friendly name from context if available
        breadcrumbs.push({
          label: params.id ? 'Details' : segment,
          path: currentPath
        });
        continue;
      }

      // Handle special segments
      switch (segment) {
        case 'thumbnails':
          breadcrumbs.push({ label: 'Thumbnails', path: currentPath });
          break;
        case 'projects':
          breadcrumbs.push({ label: 'Projects', path: currentPath });
          break;
        case 'templates':
          breadcrumbs.push({ label: 'Templates', path: currentPath });
          break;
        case 'analytics':
          breadcrumbs.push({ label: 'Analytics', path: currentPath });
          break;
        case 'settings':
          breadcrumbs.push({ label: 'Settings', path: currentPath });
          break;
        case 'profile':
          breadcrumbs.push({ label: 'Profile', path: currentPath });
          break;
        case 'new':
          breadcrumbs.push({ label: 'Create New', path: currentPath });
          break;
        case 'edit':
          breadcrumbs.push({ label: 'Edit', path: currentPath });
          break;
        case 'create':
          breadcrumbs.push({ label: 'Create', path: currentPath });
          break;
        case 'advanced':
          breadcrumbs.push({ label: 'Advanced', path: currentPath });
          break;
        case 'social':
          breadcrumbs.push({ label: 'Social', path: currentPath });
          break;
        case 'batch-edit':
          breadcrumbs.push({ label: 'Batch Edit', path: currentPath });
          break;
        default:
          breadcrumbs.push({ 
            label: segment.charAt(0).toUpperCase() + segment.slice(1), 
            path: currentPath 
          });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't show breadcrumbs on landing page or login/register
  if (location.pathname === '/' || location.pathname.includes('/login') || location.pathname.includes('/register')) {
    return null;
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs__list">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          
          return (
            <li key={crumb.path} className="breadcrumbs__item">
              {!isLast ? (
                <>
                  <Link to={crumb.path} className="breadcrumbs__link">
                    {crumb.label}
                  </Link>
                  <span className="breadcrumbs__separator" aria-hidden="true">
                    /
                  </span>
                </>
              ) : (
                <span className="breadcrumbs__current" aria-current="page">
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
