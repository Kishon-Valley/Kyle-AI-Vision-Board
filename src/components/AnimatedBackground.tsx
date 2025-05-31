
import React, { useState, useEffect } from 'react';

const AnimatedBackground = () => {
  const backgroundImages = [
    "https://images.unsplash.com/photo-1721322800607-8c38375eef04?w=1920&h=1080&fit=crop",
    "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=1920&h=1080&fit=crop", 
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&h=1080&fit=crop",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1920&h=1080&fit=crop",
    "https://images.unsplash.com/photo-1500673922987-e212871fec22?w=1920&h=1080&fit=crop"
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextImageIndex, setNextImageIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      
      setTimeout(() => {
        setCurrentImageIndex(nextImageIndex);
        setNextImageIndex((nextImageIndex + 1) % backgroundImages.length);
        setIsTransitioning(false);
      }, 1000);
    }, 4000);

    return () => clearInterval(interval);
  }, [nextImageIndex, backgroundImages.length]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Current Image */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          backgroundImage: `url(${backgroundImages[currentImageIndex]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(8px)',
          transform: 'scale(1.1)',
          isolation: 'isolate'
        }}
      />
      
      {/* Next Image */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ${
          isTransitioning ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          backgroundImage: `url(${backgroundImages[nextImageIndex]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(8px)',
          transform: 'scale(1.1)',
          isolation: 'isolate'
        }}
      />
      
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" style={{ isolation: 'isolate' }} />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/30 via-transparent to-orange-900/30 dark:from-slate-900/50 dark:to-slate-800/50" style={{ isolation: 'isolate' }} />
    </div>
  );
};

export default AnimatedBackground;
