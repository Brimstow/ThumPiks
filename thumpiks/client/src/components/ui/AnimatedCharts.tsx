import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Activity, Target } from 'lucide-react';

interface DataPoint {
  label: string;
  value: number;
  color: string;
  gradient: string;
}

interface AnimatedBarChartProps {
  data: DataPoint[];
  title: string;
  subtitle?: string;
  animated?: boolean;
}

interface CircularProgressProps {
  percentage: number;
  size: number;
  strokeWidth: number;
  color: string;
  backgroundColor?: string;
  children?: React.ReactNode;
}

interface WaveProgressProps {
  percentage: number;
  color: string;
  size: number;
}

// Animated Bar Chart Component
export const AnimatedBarChart: React.FC<AnimatedBarChartProps> = ({ 
  data, 
  title, 
  subtitle,
  animated = true 
}) => {
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setAnimationProgress(100);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setAnimationProgress(100);
    }
  }, [animated]);

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-[#2563ff]/10 text-[#2563ff] rounded-xl">
          <BarChart3 className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-slate-50">{title}</h3>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative h-64 flex items-end justify-center space-x-4">
        {/* Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between opacity-20">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-full h-px bg-slate-700" />
          ))}
        </div>

        {/* Bars */}
        {data.map((item, index) => {
          const height = (item.value / maxValue) * 100;
          const animatedHeight = (animationProgress / 100) * height;
          
          return (
            <div 
              key={item.label} 
              className="relative flex flex-col items-center group cursor-pointer"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Bar */}
              <div className="relative">
                <div
                  className={`w-12 rounded-t-lg transition-all duration-300 relative`}
                  style={{
                    height: `${animatedHeight * 2}px`,
                    backgroundColor: item.color,
                    transition: animated ? 'height 1s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                    transitionDelay: `${index * 100}ms`
                  }}
                >
                  {/* Value Label */}
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-700 text-white text-xs px-2 py-1 rounded">
                    {item.value}
                  </div>
                </div>
              </div>
              
              {/* Label */}
              <span className="text-xs font-bold text-slate-400 mt-3 group-hover:text-[#2563ff] transition-colors">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

    </div>
  );
};

// Circular Progress Component
export const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size,
  strokeWidth,
  color,
  backgroundColor = '#1e293b',
  children
}) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 300);
    return () => clearTimeout(timer);
  }, [percentage]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      
      {/* Center Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-50">{animatedPercentage}%</div>
            <div className="text-sm text-slate-400">Complete</div>
          </div>
        )}
      </div>
    </div>
  );
};

// Wave Progress Component
export const WaveProgress: React.FC<WaveProgressProps> = ({ percentage, color, size }) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 500);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div 
      className="relative rounded-full overflow-hidden border-4 border-slate-700 shadow-md"
      style={{ width: size, height: size }}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-slate-800" />
      
      {/* Wave Animation */}
      <div 
        className="absolute bottom-0 left-0 w-full transition-all duration-2000 ease-out"
        style={{ 
          height: `${animatedPercentage}%`,
          background: `linear-gradient(0deg, ${color}, ${color}80)`
        }}
      />
      
      {/* Percentage Text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-white drop-shadow-lg">
            {animatedPercentage}%
          </div>
        </div>
      </div>
    </div>
  );
};

// Animated Line Chart Component
export const AnimatedLineChart: React.FC<{ data: number[], color: string }> = ({ data, color }) => {
  const [pathLength, setPathLength] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setPathLength(100);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 300;
    const y = 100 - ((value - minValue) / range) * 80;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="relative bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
      <svg width="300" height="100" className="overflow-visible">
        {/* Grid */}
        <defs>
          <pattern id="grid" width="30" height="20" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" opacity="0.3" />
        
        {/* Line Path */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="500"
          strokeDashoffset={500 - (pathLength * 5)}
          className="transition-all duration-2000 ease-out"
        />
        
        {/* Data Points */}
        {data.map((value, index) => {
          const x = (index / (data.length - 1)) * 300;
          const y = 100 - ((value - minValue) / range) * 80;
          
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="4"
              fill={color}
              className="animate-pulse cursor-pointer hover:r-6 transition-all duration-200"
              style={{
                animationDelay: `${index * 200}ms`
              }}
            />
          );
        })}
      </svg>
    </div>
  );
};

// Dashboard Stats Grid Component
export const DashboardStatsGrid: React.FC = () => {
  const chartData: DataPoint[] = [
    { label: 'Jan', value: 45, color: '#3b82f6', gradient: 'bg-blue-500' },
    { label: 'Feb', value: 65, color: '#3b82f6', gradient: 'bg-blue-500' },
    { label: 'Mar', value: 35, color: '#3b82f6', gradient: 'bg-blue-400' },
    { label: 'Apr', value: 85, color: '#3b82f6', gradient: 'bg-blue-600' },
    { label: 'May', value: 55, color: '#3b82f6', gradient: 'bg-blue-500' },
    { label: 'Jun', value: 75, color: '#3b82f6', gradient: 'bg-blue-600' }
  ];

  const lineData = [20, 35, 25, 60, 45, 70, 55, 80, 65, 90];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Animated Bar Chart */}
      <div className="lg:col-span-2">
        <AnimatedBarChart 
          data={chartData}
          title="Monthly Performance"
          subtitle="Revenue growth over time"
        />
      </div>

      {/* Progress Indicators */}
      <div className="space-y-8">
        {/* Circular Progress */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold text-slate-50 mb-1">Goal Achievement</h3>
            <p className="text-sm text-slate-400">This month's target</p>
          </div>
          <div className="flex justify-center">
            <CircularProgress
              percentage={78}
              size={120}
              strokeWidth={8}
              color="#3b82f6"
            />
          </div>
        </div>

        {/* Wave Progress */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold text-slate-50 mb-1">Completion Rate</h3>
            <p className="text-sm text-slate-400">Project milestone</p>
          </div>
          <div className="flex justify-center">
            <WaveProgress
              percentage={65}
              color="#10b981"
              size={100}
            />
          </div>
        </div>
      </div>

      {/* Line Chart */}
      <div className="lg:col-span-3">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-[#2563ff]/10 text-[#2563ff] rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-50">Growth Trend</h3>
              <p className="text-sm text-slate-400">10-day performance overview</p>
            </div>
          </div>
          <AnimatedLineChart data={lineData} color="#3b82f6" />
        </div>
      </div>
    </div>
  );
};