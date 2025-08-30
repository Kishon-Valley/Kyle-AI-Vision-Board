import React from 'react';





const Footer = () => {
  return (
    <footer className="bg-slate-800/90 dark:bg-slate-950/90 backdrop-blur-md border-t border-slate-700/50 dark:border-slate-800/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center space-y-6">
          {/* Logo and Description */}
          <div>
            <div className="flex items-center justify-center space-x-2 mb-3">
              <img src="/kyle%20logo.jpg" alt="Moodboard Generator Logo" className="h-10 w-10 rounded-full object-cover" />
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                 Moodboard Generator
              </span>
            </div>
            <p className="text-slate-400 mb-4 max-w-md mx-auto">
              AI-powered interior design mood boards to bring your vision to life.
            </p>
          </div>

          {/* Attribution and Copyright */}
          <div className="space-y-1 pt-4 border-t border-slate-700/50 dark:border-slate-800/50">
            <p className="text-sm font-medium">
              Built by{' '}
              <a 
                href="https://lmtsoftware-portfolio.vercel.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent hover:underline underline-offset-4 decoration-2 transition-all duration-300 hover:from-blue-300 hover:to-cyan-300 font-semibold"
              >
                SofiTechAiSolutions
              </a>
            </p>
            <p className="text-xs text-slate-500">
              Copyright © {new Date().getFullYear()} Moodboard Generator. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
