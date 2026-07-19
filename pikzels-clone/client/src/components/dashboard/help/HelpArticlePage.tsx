import React, { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft, ThumbsUp, ThumbsDown } from 'lucide-react';
import {
  getCategoryBySlug,
  getArticleBySlug,
  getRelatedArticles,
} from './helpData';

const HelpArticlePage: React.FC = () => {
  const { categorySlug, articleSlug } = useParams<{
    categorySlug: string;
    articleSlug: string;
  }>();
  const [feedback, setFeedback] = useState<'helpful' | 'not-helpful' | null>(null);

  const category = categorySlug ? getCategoryBySlug(categorySlug) : undefined;
  const article =
    categorySlug && articleSlug
      ? getArticleBySlug(categorySlug, articleSlug)
      : undefined;

  if (!category || !article) {
    return <Navigate to={category ? `/dashboard/help/${category.slug}` : '/dashboard/help'} replace />;
  }

  const relatedArticles = getRelatedArticles(article);

  return (
    <>
      {/* Breadcrumbs */}
      <nav className="mb-8" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm flex-wrap">
          <li>
            <Link to="/dashboard/help" className="text-slate-400 hover:text-blue-400 transition-colors">
              Help
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </li>
          <li>
            <Link
              to={`/dashboard/help/${category.slug}`}
              className="text-slate-400 hover:text-blue-400 transition-colors"
            >
              {category.title}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </li>
          <li>
            <span className="text-slate-200" aria-current="page">
              {article.title}
            </span>
          </li>
        </ol>
      </nav>

      {/* Article Content */}
      <article className="max-w-3xl mb-16">
        {/* Category tag */}
        <div className="mb-4">
          <Link
            to={`/dashboard/help/${category.slug}`}
            className={`inline-flex items-center gap-1.5 text-xs ${category.color} bg-slate-900 border border-slate-800 rounded-full px-3 py-1 hover:border-slate-700 transition-colors`}
          >
            <category.icon className="w-3.5 h-3.5" />
            {category.title}
          </Link>
        </div>

        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-50 tracking-tight mb-8">
          {article.title}
        </h1>

        {/* Paragraphs */}
        <div className="space-y-5">
          {article.content.map((paragraph, index) => (
            <p key={index} className="text-slate-300 leading-relaxed text-[15px]">
              {paragraph}
            </p>
          ))}
        </div>
      </article>

      {/* Was this helpful? */}
      <div className="max-w-3xl mb-16 p-6 rounded-xl bg-[#020818] border border-slate-800">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <p className="text-slate-300 font-medium">Was this article helpful?</p>
          {feedback ? (
            <p className="text-sm text-slate-400">
              {feedback === 'helpful'
                ? 'Thanks for the feedback!'
                : 'Sorry to hear that. We\'ll work on improving this article.'}
            </p>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFeedback('helpful')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600 hover:text-emerald-400 transition-all text-sm"
              >
                <ThumbsUp className="w-4 h-4" />
                Yes
              </button>
              <button
                onClick={() => setFeedback('not-helpful')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600 hover:text-rose-400 transition-all text-sm"
              >
                <ThumbsDown className="w-4 h-4" />
                No
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <div className="max-w-3xl mb-16">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Related Articles</h2>
          <div className="grid gap-3">
            {relatedArticles.map((related) => {
              const relatedCategory = getCategoryBySlug(related.categorySlug);
              return (
                <Link
                  key={related.slug}
                  to={`/dashboard/help/${related.categorySlug}/${related.slug}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-all group"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    {relatedCategory && (
                      <span className={`text-xs ${relatedCategory.color} block mb-1`}>
                        {relatedCategory.title}
                      </span>
                    )}
                    <span className="text-slate-300 font-medium group-hover:text-blue-400 transition-colors block truncate">
                      {related.title}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Back Link */}
      <Link
        to={`/dashboard/help/${category.slug}`}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {category.title}
      </Link>
    </>
  );
};

export default HelpArticlePage;
