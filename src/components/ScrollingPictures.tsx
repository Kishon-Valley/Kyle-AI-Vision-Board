
import React from 'react';

const ScrollingPictures = () => {
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

  return (
    <div className="absolute top-0 left-0 right-0 h-32 overflow-hidden opacity-30 pointer-events-none">
      {/* First row - moving right */}
      <div className="flex animate-[scroll-right_30s_linear_infinite] mb-4">
        {[...scrollingImages, ...scrollingImages].map((image, index) => (
          <div
            key={`row1-${index}`}
            className="flex-shrink-0 w-24 h-16 mx-2 rounded-lg overflow-hidden"
            style={{
              filter: 'blur(2px)',
              opacity: 0.7
            }}
          >
            <img
              src={image}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
      
      {/* Second row - moving left */}
      <div className="flex animate-[scroll-left_25s_linear_infinite]">
        {[...scrollingImages.slice().reverse(), ...scrollingImages.slice().reverse()].map((image, index) => (
          <div
            key={`row2-${index}`}
            className="flex-shrink-0 w-24 h-16 mx-2 rounded-lg overflow-hidden"
            style={{
              filter: 'blur(2px)',
              opacity: 0.7
            }}
          >
            <img
              src={image}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScrollingPictures;
