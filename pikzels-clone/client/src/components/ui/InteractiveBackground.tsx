import React, { useEffect, useState, useCallback, useRef } from 'react';

interface FloatingShape {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  direction: number;
  rotation: number;
  rotationSpeed: number;
  shape: 'circle' | 'triangle' | 'square' | 'hexagon';
  opacity: number;
}

interface MouseFollower {
  x: number;
  y: number;
  active: boolean;
}

const InteractiveBackground: React.FC = () => {
  const [shapes, setShapes] = useState<FloatingShape[]>([]);
  const [mouseFollower, setMouseFollower] = useState<MouseFollower>({ x: 0, y: 0, active: false });
  const [mouseTrail, setMouseTrail] = useState<Array<{x: number, y: number, id: string}>>([]);
  const trailIdCounter = useRef(0);

  // Generate floating shapes
  const generateShapes = useCallback(() => {
    const shapeTypes: FloatingShape['shape'][] = ['circle', 'triangle', 'square', 'hexagon'];
    const colors = [
      'rgba(59, 130, 246, 0.1)',   // Blue
      'rgba(139, 92, 246, 0.1)',   // Purple  
      'rgba(236, 72, 153, 0.1)',   // Pink
      'rgba(16, 185, 129, 0.1)',   // Green
      'rgba(245, 158, 11, 0.1)',   // Amber
      'rgba(239, 68, 68, 0.1)',    // Red
    ];

    const timestamp = Date.now();
    return Array.from({ length: 20 }, (_, i) => ({
      id: timestamp + i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 80 + 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: Math.random() * 0.5 + 0.1,
      direction: Math.random() * 360,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 2,
      shape: shapeTypes[Math.floor(Math.random() * shapeTypes.length)],
      opacity: Math.random() * 0.3 + 0.1
    }));
  }, []);

  // Initialize shapes on mount
  useEffect(() => {
    setShapes(generateShapes());
  }, [generateShapes]);

  // Animate shapes
  useEffect(() => {
    const animateShapes = () => {
      setShapes(prevShapes => 
        prevShapes.map(shape => {
          let newX = shape.x + Math.cos(shape.direction * Math.PI / 180) * shape.speed;
          let newY = shape.y + Math.sin(shape.direction * Math.PI / 180) * shape.speed;

          // Bounce off walls
          if (newX < 0 || newX > window.innerWidth - shape.size) {
            shape.direction = 180 - shape.direction;
            newX = Math.max(0, Math.min(newX, window.innerWidth - shape.size));
          }
          if (newY < 0 || newY > window.innerHeight - shape.size) {
            shape.direction = -shape.direction;
            newY = Math.max(0, Math.min(newY, window.innerHeight - shape.size));
          }

          return {
            ...shape,
            x: newX,
            y: newY,
            rotation: shape.rotation + shape.rotationSpeed
          };
        })
      );
    };

    const interval = setInterval(animateShapes, 16); // ~60fps
    return () => clearInterval(interval);
  }, []);

  // Handle mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseFollower({ x: e.clientX, y: e.clientY, active: true });
      
      // Add to mouse trail
      setMouseTrail(prev => {
        trailIdCounter.current += 1;
        const newTrail = [...prev, { x: e.clientX, y: e.clientY, id: `trail-${trailIdCounter.current}-${Date.now()}` }];
        return newTrail.slice(-10); // Keep only last 10 positions
      });
    };

    const handleMouseLeave = () => {
      setMouseFollower(prev => ({ ...prev, active: false }));
      setMouseTrail([]);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Clean up old mouse trail points
  useEffect(() => {
    const cleanupTrail = () => {
      setMouseTrail(prev => 
        prev.filter(point => {
          const timestamp = parseInt(point.id.split('-')[2]);
          return Date.now() - timestamp < 500;
        })
      );
    };

    const interval = setInterval(cleanupTrail, 100);
    return () => clearInterval(interval);
  }, []);

  const renderShape = (shape: FloatingShape) => {
    const baseClasses = "absolute transition-all duration-1000 animate-float";
    const style = {
      left: shape.x,
      top: shape.y,
      width: shape.size,
      height: shape.size,
      backgroundColor: shape.color,
      transform: `rotate(${shape.rotation}deg)`,
      opacity: shape.opacity,
      filter: 'blur(0.5px)',
    };

    switch (shape.shape) {
      case 'circle':
        return (
          <div
            key={shape.id}
            className={`${baseClasses} rounded-full`}
            style={style}
          />
        );
      
      case 'triangle':
        return (
          <div
            key={shape.id}
            className={baseClasses}
            style={{
              ...style,
              backgroundColor: 'transparent',
              width: 0,
              height: 0,
              borderLeft: `${shape.size / 2}px solid transparent`,
              borderRight: `${shape.size / 2}px solid transparent`,
              borderBottom: `${shape.size}px solid ${shape.color}`,
            }}
          />
        );
      
      case 'square':
        return (
          <div
            key={shape.id}
            className={`${baseClasses} rounded-lg`}
            style={style}
          />
        );
      
      case 'hexagon':
        return (
          <div
            key={shape.id}
            className={baseClasses}
            style={{
              ...style,
              backgroundColor: shape.color,
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            }}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/30 to-pink-50/30 animate-gradient" />
      
      {/* Floating Geometric Shapes */}
      {shapes.map(renderShape)}
      
      {/* Mouse Follower Effect */}
      {mouseFollower.active && (
        <div
          className="absolute pointer-events-none z-50"
          style={{
            left: mouseFollower.x - 20,
            top: mouseFollower.y - 20,
          }}
        >
          <div className="w-10 h-10 border-2 border-blue-400/50 rounded-full animate-ping" />
          <div className="absolute inset-0 w-10 h-10 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full animate-pulse" />
        </div>
      )}
      
      {/* Mouse Trail */}
      {mouseTrail.map((point, index) => (
        <div
          key={point.id}
          className="absolute pointer-events-none w-2 h-2 bg-blue-400/30 rounded-full animate-ping"
          style={{
            left: point.x - 4,
            top: point.y - 4,
            opacity: (index + 1) / mouseTrail.length * 0.5,
            animationDelay: `${index * 50}ms`
          }}
        />
      ))}
      
      {/* Ambient Light Orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-radial from-blue-400/10 via-blue-400/5 to-transparent rounded-full animate-pulse blur-xl" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-radial from-purple-400/10 via-purple-400/5 to-transparent rounded-full animate-pulse blur-xl" style={{animationDelay: '1s'}} />
      <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-gradient-radial from-pink-400/10 via-pink-400/5 to-transparent rounded-full animate-pulse blur-xl" style={{animationDelay: '2s'}} />
      
      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'float 20s ease-in-out infinite'
        }}
      />
      
      {/* Sparkle Effects */}
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={`sparkle-${i}`}
          className="absolute w-1 h-1 bg-white/60 rounded-full animate-ping"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 2}s`
          }}
        />
      ))}
    </div>
  );
};

export default InteractiveBackground;