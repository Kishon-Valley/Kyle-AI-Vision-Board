import React, { useState, useEffect } from 'react';

const AnimatedBackground = () => {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  const backgroundImages = [
    "https://images.unsplash.com/photo-1721322800607-8c38375eef04?w=1920&h=1080&fit=crop",
    "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=1920&h=1080&fit=crop", 
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&h=1080&fit=crop",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1920&h=1080&fit=crop",
    "https://images.unsplash.com/photo-1500673922987-e212871fec22?w=1920&h=1080&fit=crop"
  ];

  const fallbackImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080' viewBox='0 0 1920 1080'%3E%3Crect width='1920' height='1080' fill='%231e293b'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' fill='%2394a3b8'%3EBackground Image%3C/text%3E%3C/svg%3E";

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextImageIndex, setNextImageIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleImageError = (imageUrl: string) => {
    setImageErrors(prev => ({ ...prev, [imageUrl]: true }));
  };

  const handleImageLoad = (imageUrl: string) => {
    setLoadedImages(prev => ({ ...prev, [imageUrl]: true }));
  };

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

  const renderBackgroundImage = (imageUrl: string, isTransitioning: boolean) => {
    const isError = imageErrors[imageUrl];
    const isLoaded = loadedImages[imageUrl];

    return (
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          backgroundImage: `url(${isError ? fallbackImage : imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(8px)',
          transform: 'scale(1.1)',
          isolation: 'isolate',
          opacity: isLoaded ? 1 : 0
        }}
      >
        {!isError && (
          <img
            src={imageUrl}
            alt=""
            className="hidden"
            onError={() => handleImageError(imageUrl)}
            onLoad={() => handleImageLoad(imageUrl)}
          />
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {renderBackgroundImage(backgroundImages[currentImageIndex], isTransitioning)}
      {renderBackgroundImage(backgroundImages[nextImageIndex], !isTransitioning)}
      
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" style={{ isolation: 'isolate' }} />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/30 via-transparent to-orange-900/30 dark:from-slate-900/50 dark:to-slate-800/50" style={{ isolation: 'isolate' }} />
    </div>
  );
};

export default AnimatedBackground;
