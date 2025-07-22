import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import AnimatedBackground from '../components/AnimatedBackground';
import ScrollingPictures from '../components/ScrollingPictures';
import { Sparkles, Wand2, Download, ArrowRight } from 'lucide-react';

const LandingPage = () => {
  const sampleMoodboards = [
    {
      id: 1,
      image: "/bohemian-dining-room-moodboard%20(1).jpg",
      style: "Bohemian Dining Room"
    },
    {
      id: 2,
      image: "/contemporary-bedroom-moodboard.jpg",
      style: "Contemporary Bedroom"
    },
    {
      id: 3,
      image: "/scandinavian-kitchen-moodboard.jpg",
      style: "Scandinavian Kitchen"
    }
  ];

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      <ScrollingPictures />
      
      {/* Hero Section */}
      <section className="relative px-4 py-20 lg:py-32" style={{ isolation: 'isolate' }}>
        <div className="max-w-7xl mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl lg:text-6xl font-bold text-slate-800 dark:text-white mb-6 leading-tight drop-shadow-md dark:drop-shadow-2xl">
              AI-Powered Interior Design
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-500">
                Mood Boards
              </span>
            </h1>
            <p className="text-xl text-slate-700 dark:text-slate-200 mb-8 max-w-2xl mx-auto drop-shadow-sm dark:drop-shadow-xl">
              Answer a few questions about your style preferences and watch AI create
              a personalized mood board that brings your vision to life.
            </p>
            <Link to="/questionnaire">
              <Button size="lg" className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white px-8 py-3 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Sample Mood Boards */}
      <section className="relative px-4 py-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm" style={{ isolation: 'isolate' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-4">
              Sample AI-Generated Mood Boards
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-lg">
              See what our AI can create for different design styles
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {sampleMoodboards.map((board, index) => (
              <Card key={board.id} className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardContent className="p-0">
                  <div className="relative overflow-hidden">
                    <img 
                      src={board.image}
                      alt={board.style}
                      className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                      {board.style}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300">
                      Curated elements that capture this design aesthetic
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative px-4 py-16 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm" style={{ isolation: 'isolate' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-lg">
              Three simple steps to your perfect mood board
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                1. Share Your Style
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                Answer 4 quick questions about your design preferences and lifestyle
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wand2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                2. AI Magic
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                Our AI analyzes your preferences and creates a personalized mood board
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                3. Download & Share
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                Save your mood board, share it, or use it to guide your design project
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-4 py-20 bg-gradient-to-r from-orange-500/90 to-pink-500/90 backdrop-blur-sm" style={{ isolation: 'isolate' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Space?
          </h2>
          <p className="text-xl text-orange-100 mb-8">
            Join thousands of users who've discovered their perfect design style with AI
          </p>
          <Link to="/questionnaire">
            <Button size="lg" variant="secondary" className="px-8 py-3 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              Create Your Mood Board
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
