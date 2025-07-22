import React, { useState } from 'react';

const ScrollingPictures = () => {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const scrollingImages = [
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1616047006789-b7af710a08de?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?w=400&h=300&fit=crop"
  ];

  const fallbackImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%239ca3af'%3EImage%3C/text%3E%3C/svg%3E";

  const handleImageError = (imageUrl: string) => {
    setImageErrors(prev => ({ ...prev, [imageUrl]: true }));
  };

  const renderImageRow = (images: string[], direction: 'right' | 'left') => (
    <div className={`flex animate-[scroll-${direction}_${direction === 'right' ? '30s' : '25s'}_linear_infinite] ${direction === 'left' ? 'mt-4' : ''}`}>
      {[...images, ...images].map((image, index) => (
        <div
          key={`${direction}-${index}`}
          className="flex-shrink-0 w-24 h-16 mx-2 rounded-lg overflow-hidden"
          style={{
            filter: 'blur(2px)',
            opacity: 0.7
          }}
        >
          <img
            src={imageErrors[image] ? fallbackImage : image}
            alt=""
            className="w-full h-full object-cover"
            onError={() => handleImageError(image)}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="absolute top-0 left-0 right-0 h-32 overflow-hidden opacity-30 pointer-events-none">
      {renderImageRow(scrollingImages, 'right')}
      {renderImageRow([...scrollingImages].reverse(), 'left')}
    </div>
  );
};

export default ScrollingPictures;
