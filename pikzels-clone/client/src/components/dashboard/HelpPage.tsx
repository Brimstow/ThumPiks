import React from 'react';
import {
  Search,
  Rocket,
  CreditCard,
  Wand2,
  UserCircle,
  Code2,
  MessageCircleQuestion,
  ChevronRight,
  Mail,
  MessageSquare,
} from 'lucide-react';
import Tooltip from '../ui/Tooltip';

const HelpPage: React.FC = () => {
  const categories = [
    {
      id: 1,
      icon: Rocket,
      title: 'Getting Started',
      description: 'Everything you need to know to create your first thumbnail and set up your account.',
      color: 'text-blue-400',
    },
    {
      id: 2,
      icon: CreditCard,
      title: 'Billing & Plans',
      description: 'Manage your subscription, credit usage, payment methods and invoices.',
      color: 'text-emerald-400',
    },
    {
      id: 3,
      icon: Wand2,
      title: 'Editor Tools',
      description: 'Deep dive into face swapping, text generation, background removal and styles.',
      color: 'text-purple-400',
    },
    {
      id: 4,
      icon: UserCircle,
      title: 'Account Settings',
      description: 'Update your profile, change password, manage team members and notifications.',
      color: 'text-orange-400',
    },
    {
      id: 5,
      icon: Code2,
      title: 'API & Integration',
      description: 'Documentation for developers integrating thumbnail generation into their apps.',
      color: 'text-pink-400',
    },
    {
      id: 6,
      icon: MessageCircleQuestion,
      title: 'Troubleshooting',
      description: 'Solutions to common errors, generation failures, and export issues.',
      color: 'text-slate-400',
    },
  ];

  const popularArticles = [
    'How do I swap faces in my thumbnails?',
    'Understanding credit usage and renewal cycles',
    'Can I use my own fonts and branding assets?',
    'Exporting high-resolution thumbnails for YouTube',
  ];

  return (
    <>
      {/* Help Hero Section */}
      <div className="relative mb-16 text-center">
        {/* Glow Effect */}
        <div className="absolute inset-0 -top-12 mx-auto h-64 max-w-4xl rounded-full bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-violet-500/10 blur-3xl -z-10"></div>

        <h1 className="text-4xl sm:text-5xl font-semibold text-slate-50 tracking-tight mb-4">
          How can we help you?
        </h1>
        <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
          Search our knowledge base or browse categories below to find answers about generating
          thumbnails, billing, and API access.
        </p>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto relative group">
          <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-lg group-hover:bg-blue-500/30 transition-all opacity-0 group-hover:opacity-100"></div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search for articles, guides, and more..."
              className="w-full pl-12 pr-4 py-4 bg-[#020818] border border-slate-800 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-xl shadow-black/20"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              <Search className="w-5 h-5" />
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:block">
              <span className="text-xs text-slate-600 border border-slate-800 rounded px-1.5 py-0.5">
                ⌘ K
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {categories.map((category) => (
          <a
            key={category.id}
            href="#"
            className="group p-6 rounded-2xl bg-[#020818] border border-slate-800 hover:border-slate-700 hover:bg-slate-900/50 transition-all duration-300 relative overflow-hidden"
          >
            <Tooltip content={category.title} side="top">
              <div
                className={`w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center ${category.color} mb-4 group-hover:scale-110 transition-transform`}
              >
                <category.icon className="w-6 h-6" />
              </div>
            </Tooltip>
            <h3 className="text-lg font-semibold text-slate-100 mb-2">{category.title}</h3>
            <p className="text-sm text-slate-400">{category.description}</p>
          </a>
        ))}
      </div>

      {/* Popular Articles Section */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl font-semibold text-slate-50 mb-6 tracking-tight">
          Popular Articles
        </h2>
        <div className="grid gap-4">
          {popularArticles.map((article, index) => (
            <a
              key={index}
              href="#"
              className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-all group"
            >
              <span className="text-slate-300 font-medium group-hover:text-blue-400 transition-colors">
                {article}
              </span>
              <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-slate-300" />
            </a>
          ))}
        </div>
      </div>

      {/* Contact Support Footer */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#020818] p-8 sm:p-12 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 to-slate-900/0"></div>
        <div className="relative z-10">
          <h3 className="text-2xl font-semibold text-slate-50 mb-3 tracking-tight">
            Still need help?
          </h3>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Our support team is available Mon-Fri, 9am - 5pm EST to assist you with any questions or
            issues.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Tooltip content="Send us an email" side="top">
              <button className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-200 transition-colors w-full sm:w-auto">
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </button>
            </Tooltip>
            <Tooltip content="Start a live chat" side="top">
              <button className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-transparent px-6 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-800 transition-colors w-full sm:w-auto">
                <MessageSquare className="w-4 h-4 mr-2" />
                Live Chat
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </>
  );
};

export default HelpPage;