import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { getCategoryBySlug, getArticlesByCategory } from './helpData';

const HelpCategoryPage: React.FC = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const category = categorySlug ? getCategoryBySlug(categorySlug) : undefined;
  const articles = categorySlug ? getArticlesByCategory(categorySlug) : [];

  if (!category) {
    return <Navigate to="/dashboard/help" replace />;
  }

  const Icon = category.icon;

  return (
    <>
      {/* Breadcrumbs */}
      <nav className="mb-8" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <Link to="/dashboard/help" className="text-slate-400 hover:text-blue-400 transition-colors">
              Help
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </li>
          <li>
            <span className="text-slate-200" aria-current="page">{category.title}</span>
          </li>
        </ol>
      </nav>

      {/* Category Header */}
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-4">
          <div
            className={`w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center ${category.color}`}
          >
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-slate-50 tracking-tight">
              {category.title}
            </h1>
            <p className="text-slate-400 mt-1">{category.description}</p>
          </div>
        </div>
      </div>

      {/* Article List */}
      <div className="max-w-4xl mb-16">
        <h2 className="text-lg font-medium text-slate-300 mb-4">
          {articles.length} {articles.length === 1 ? 'article' : 'articles'}
        </h2>
        <div className="grid gap-4">
          {articles.map((article) => (
            <Link
              key={article.slug}
              to={`/dashboard/help/${category.slug}/${article.slug}`}
              className="flex items-center justify-between p-5 rounded-xl bg-[#020818] border border-slate-800 hover:border-slate-700 hover:bg-slate-900/50 transition-all group"
            >
              <div className="flex-1 min-w-0 mr-4">
                <h3 className="text-slate-100 font-medium group-hover:text-blue-400 transition-colors mb-1">
                  {article.title}
                </h3>
                <p className="text-sm text-slate-500 truncate">{article.summary}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-300 flex-shrink-0 transition-colors" />
            </Link>
          ))}
        </div>

        {articles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">No articles in this category yet.</p>
          </div>
        )}
      </div>

      {/* Back Link */}
      <Link
        to="/dashboard/help"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Help Center
      </Link>
    </>
  );
};

export default HelpCategoryPage;
