import React from 'react';
import { Instagram, Twitter, Linkedin, Youtube } from 'lucide-react';

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
                 Moodboard GeneratorX
              </span>
            </div>
            <p className="text-slate-400 mb-4 max-w-md mx-auto">
              AI-powered interior design mood boards to bring your vision to life.
            </p>
          </div>

          {/* Social Media Links */}
          <div className="flex justify-center space-x-4">
            <a 
              href="#" 
              className="p-2 bg-gradient-to-r from-orange-500/20 to-pink-500/20 rounded-full hover:from-orange-500/30 hover:to-pink-500/30 transition-all duration-300 transform hover:scale-110 backdrop-blur-sm"
            >
              <Instagram className="w-4 h-4 text-orange-400" />
            </a>
            <a 
              href="#" 
              className="p-2 bg-gradient-to-r from-orange-500/20 to-pink-500/20 rounded-full hover:from-orange-500/30 hover:to-pink-500/30 transition-all duration-300 transform hover:scale-110 backdrop-blur-sm"
            >
              <Twitter className="w-4 h-4 text-orange-400" />
            </a>
            <a 
              href="#" 
              className="p-2 bg-gradient-to-r from-orange-500/20 to-pink-500/20 rounded-full hover:from-orange-500/30 hover:to-pink-500/30 transition-all duration-300 transform hover:scale-110 backdrop-blur-sm"
            >
              <Linkedin className="w-4 h-4 text-orange-400" />
            </a>
            <a 
              href="#" 
              className="p-2 bg-gradient-to-r from-orange-500/20 to-pink-500/20 rounded-full hover:from-orange-500/30 hover:to-pink-500/30 transition-all duration-300 transform hover:scale-110 backdrop-blur-sm"
            >
              <Youtube className="w-4 h-4 text-orange-400" />
            </a>
          </div>

          {/* Attribution and Copyright */}
          <div className="space-y-1 pt-4 border-t border-slate-700/50 dark:border-slate-800/50">
            <p className="text-sm font-medium bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
              Built by SofiTchAiSolutions
            </p>
            <p className="text-xs text-slate-500">
              {new Date().getFullYear()} Moodboard Generator. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
