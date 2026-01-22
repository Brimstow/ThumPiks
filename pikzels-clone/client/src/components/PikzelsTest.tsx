import React from 'react';

const ThumPiksTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">ThumPiks Test Page</h1>
        <p className="text-white/70 mb-8">If you can see this, the component is working!</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
          <div className="p-6 bg-white/10 rounded-lg border border-white/20">
            <h3 className="text-xl font-bold mb-2">Starter</h3>
            <p className="text-3xl font-bold mb-4">$19</p>
            <button className="w-full py-2 bg-blue-500 rounded">Get Started</button>
          </div>
          
          <div className="p-6 bg-white/15 border-2 border-blue-500/30 rounded-lg">
            <div className="text-xs bg-blue-500 text-white px-2 py-1 rounded mb-2">POPULAR</div>
            <h3 className="text-xl font-bold mb-2">Professional</h3>
            <p className="text-3xl font-bold mb-4">$49</p>
            <button className="w-full py-2 bg-blue-500 rounded">Get Started</button>
          </div>
          
          <div className="p-6 bg-white/10 rounded-lg border border-white/20">
            <h3 className="text-xl font-bold mb-2">Enterprise</h3>
            <p className="text-3xl font-bold mb-4">$199</p>
            <button className="w-full py-2 bg-blue-500 rounded">Get Started</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThumPiksTest;
