import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/pricing.css';

const LandingPage2: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.error('WebGL not supported in your browser');
      return;
    }

    const vsSource = `
        attribute vec4 aVertexPosition;
        void main() {
            gl_Position = aVertexPosition;
        }
    `;
    
    const fsSource = `
        precision highp float;
        uniform vec2 iResolution;
        uniform float iTime;
        
        const float overallSpeed = 0.2;
        const float gridSmoothWidth = 0.015;
        const float scale = 5.0;
        const float minLineWidth = 0.01;
        const float maxLineWidth = 0.2;
        const float lineSpeed = 1.0 * overallSpeed;
        const float lineAmplitude = 1.0;
        const float lineFrequency = 0.2;
        const float warpSpeed = 0.2 * overallSpeed;
        const float warpFrequency = 0.5;
        const float warpAmplitude = 1.0;
        const float offsetFrequency = 0.5;
        const float offsetSpeed = 1.33 * overallSpeed;
        const float minOffsetSpread = 0.6;
        const float maxOffsetSpread = 2.0;
        const int linesPerGroup = 16;
        
        #define drawCircle(pos, radius, coord) smoothstep(radius + gridSmoothWidth, radius, length(coord - (pos)))
        #define drawSmoothLine(pos, halfWidth, t) smoothstep(halfWidth, 0.0, abs(pos - (t)))
        #define drawCrispLine(pos, halfWidth, t) smoothstep(halfWidth + gridSmoothWidth, halfWidth, abs(pos - (t)))
        
        float random(float t) {
            return (cos(t) + cos(t * 1.3 + 1.3) + cos(t * 1.4 + 1.4)) / 3.0;   
        }
        
        float getPlasmaY(float x, float horizontalFade, float offset) {
            return random(x * lineFrequency + iTime * lineSpeed) * horizontalFade * lineAmplitude + offset;
        }
        
        vec3 rainbow(float t) {
            return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
        }
        
        vec3 colorPalette(float t) {
            vec3 a = vec3(0.5, 0.5, 0.5);
            vec3 b = vec3(0.5, 0.5, 0.5);
            vec3 c = vec3(1.0, 1.0, 1.0);
            vec3 d = vec3(0.3, 0.2, 0.2);
            return a + b * cos(6.28318 * (c * t + d));
        }
        
        void main() {
            vec2 fragCoord = gl_FragCoord.xy;
            vec4 fragColor;
            
            vec2 uv = fragCoord.xy / iResolution.xy;
            vec2 space = (fragCoord - iResolution.xy / 2.0) / iResolution.x * 2.0 * scale;
            
            float horizontalFade = 1.0 - (cos(uv.x * 6.28) * 0.5 + 0.5);
            float verticalFade = 1.0 - (cos(uv.y * 6.28) * 0.5 + 0.5);
        
            space.y += random(space.x * warpFrequency + iTime * warpSpeed) * warpAmplitude * (0.5 + horizontalFade);
            space.x += random(space.y * warpFrequency + iTime * warpSpeed + 2.0) * warpAmplitude * horizontalFade;
            
            vec4 lines = vec4(0.0);
            vec3 bgColor1 = colorPalette(iTime * 0.05);
            vec3 bgColor2 = colorPalette(iTime * 0.05 + 0.33);
            
            for(int l = 0; l < linesPerGroup; l++) {
                float normalizedLineIndex = float(l) / float(linesPerGroup);
                float offsetTime = iTime * offsetSpeed;
                float offsetPosition = float(l) + space.x * offsetFrequency;
                float rand = random(offsetPosition + offsetTime) * 0.5 + 0.5;
                float halfWidth = mix(minLineWidth, maxLineWidth, rand * horizontalFade) / 2.0;
                float offset = random(offsetPosition + offsetTime * (1.0 + normalizedLineIndex)) * mix(minOffsetSpread, maxOffsetSpread, horizontalFade);
                float linePosition = getPlasmaY(space.x, horizontalFade, offset);
                float line = drawSmoothLine(linePosition, halfWidth, space.y) / 2.0 + drawCrispLine(linePosition, halfWidth * 0.15, space.y);
                
                float circleX = mod(float(l) + iTime * lineSpeed, 25.0) - 12.0;
                vec2 circlePosition = vec2(circleX, getPlasmaY(circleX, horizontalFade, offset));
                float circle = drawCircle(circlePosition, 0.01, space) * 4.0;
                
                line = line + circle;
                vec3 lineColorRGB = rainbow(normalizedLineIndex + iTime * 0.1);
                vec4 lineColor = vec4(lineColorRGB, 1.0);
                
                lines += line * lineColor * rand;
            }
            
            fragColor = vec4(mix(bgColor1, bgColor2, uv.x), 1.0);
            fragColor.rgb *= 0.3 + 0.7 * verticalFade;
            fragColor.a = 1.0;
            fragColor += lines;
            
            gl_FragColor = fragColor;
        }
    `;

    function initShaderProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string) {
      const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
      const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
      
      if (!vertexShader || !fragmentShader) return null;
      
      const shaderProgram = gl.createProgram();
      if (!shaderProgram) return null;
      
      gl.attachShader(shaderProgram, vertexShader);
      gl.attachShader(shaderProgram, fragmentShader);
      gl.linkProgram(shaderProgram);
      
      if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
      }
      
      return shaderProgram;
    }

    function loadShader(gl: WebGLRenderingContext, type: number, source: string) {
      const shader = gl.createShader(type);
      if (!shader) return null;
      
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      
      return shader;
    }

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    if (!shaderProgram) return;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
       1.0,  1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const programInfo = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      },
      uniformLocations: {
        resolution: gl.getUniformLocation(shaderProgram, 'iResolution'),
        time: gl.getUniformLocation(shaderProgram, 'iTime'),
      },
    };

    function resizeCanvas() {
      if (!canvas || !gl) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    let startTime = Date.now();
    let animationId: number;

    function render() {
      if (!gl || !canvas) return;
      
      const currentTime = (Date.now() - startTime) / 1000;
      
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      
      gl.useProgram(programInfo.program);
      
      gl.uniform2f(programInfo.uniformLocations.resolution, canvas.width, canvas.height);
      gl.uniform1f(programInfo.uniformLocations.time, currentTime);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        2,
        gl.FLOAT,
        false,
        0,
        0
      );
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
      
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      
      animationId = requestAnimationFrame(render);
    }

    animationId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return (
    <>
      {/* Add FontAwesome CSS */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;600&family=Inter:wght@400;500&display=swap" rel="stylesheet" />
      
      <div className="bg-black min-h-screen font-['Inter',system-ui,sans-serif] overflow-hidden">
        {/* WebGL Canvas Background */}
        <canvas 
          ref={canvasRef}
          className="fixed top-0 left-0 w-full h-full block z-0"
        />
        
        {/* Main Content */}
        <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-4 py-12">
          {/* Header Section */}
          <div className="w-full max-w-5xl mx-auto text-center mb-16">
            <h1 className="text-[42px] md:text-[56px] lg:text-[64px] font-[200] leading-tight tracking-[-0.03em] bg-gradient-to-r from-white via-blue-300 to-indigo-400 bg-clip-text text-transparent font-['Manrope',sans-serif]">
              Flexible AI Solutions
            </h1>
            <p className="mt-4 text-[16px] md:text-[18px] text-white/70 max-w-2xl mx-auto">
              Choose the plan that works for your workflow. All plans include core features with flexible scaling options.
            </p>
          </div>
          
          {/* Toggle */}
          <div className="mb-10 flex items-center justify-center gap-4">
            <span className="text-white/70 text-sm">Monthly</span>
            <div className="relative inline-block w-14 h-7 bg-white/10 rounded-full cursor-pointer">
              <div className="absolute left-1 top-1 w-5 h-5 bg-blue-500 rounded-full transition-transform"></div>
            </div>
            <span className="text-white text-sm">Annual <span className="text-blue-400 text-xs">Save 20%</span></span>
          </div>
          
          {/* Pricing Cards Grid */}
          <div className="grid pricing-grid gap-6 w-full max-w-6xl mx-auto items-stretch">
            
            {/* Starter Plan */}
            <div className="glass-effect bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl shadow-xl p-6 flex flex-col h-full relative hover:bg-white/10 transition-all duration-300 min-w-0 overflow-hidden">
              {/* Top Badge */}
              <div className="flex items-center mb-6">
                <div className="icon-circle">
                  <i className="fas fa-rocket text-blue-400 text-xs"></i>
                </div>
                <h3 className="ml-3 text-xl text-white font-medium">Starter</h3>
              </div>
              
              {/* Price */}
              <div className="mt-2 mb-6">
                <div className="flex items-baseline">
                  <span className="text-4xl font-[200] text-white">$19</span>
                  <span className="text-sm text-white/60 ml-2">/month</span>
                </div>
                <p className="text-white/60 text-sm mt-1">Perfect for individuals and small projects</p>
              </div>
              <div className="card-divider w-full mb-6"></div>
              
              {/* Features */}
              <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-center text-white/90 text-base">
                  <i className="fas fa-check text-emerald-400 mr-4 text-sm"></i>
                  <span>1 million tokens/month</span>
                </li>
                <li className="flex items-center text-white/90 text-base">
                  <i className="fas fa-check text-emerald-400 mr-4 text-sm"></i>
                  <span>5 custom AI models</span>
                </li>
                <li className="flex items-center text-white/90 text-base">
                  <i className="fas fa-check text-emerald-400 mr-4 text-sm"></i>
                  <span>Basic API access</span>
                </li>
                <li className="flex items-center text-white/90 text-base">
                  <i className="fas fa-check text-emerald-400 mr-4 text-sm"></i>
                  <span>Email support</span>
                </li>
                <li className="flex items-center text-white/50 text-base">
                  <i className="fas fa-times text-white/30 mr-4 text-sm"></i>
                  <span>No custom training</span>
                </li>
                <li className="flex items-center text-white/50 text-base">
                  <i className="fas fa-times text-white/30 mr-4 text-sm"></i>
                  <span>No dedicated resources</span>
                </li>
              </ul>
              
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 my-6">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-[300] text-white">99.9%</div>
                  <div className="text-xs text-white/60 mt-1">Uptime</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-[300] text-white">120ms</div>
                  <div className="text-xs text-white/60 mt-1">Latency</div>
                </div>
              </div>
              
              {/* CTA */}
              <button className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium transition-all duration-300 border border-white/20 hover:border-white/30">
                Start Free Trial
              </button>
              <p className="text-white/50 text-sm text-center mt-4">No credit card required</p>
            </div>
            
            {/* Professional Plan */}
<div className="glass-effect bg-gradient-to-br from-white/15 to-white/5 border border-blue-500/30 rounded-2xl shadow-xl p-6 flex flex-col h-full relative z-10 min-w-0 overflow-hidden">
              {/* Popular Badge */}
              <div className="pricing-badge">
                MOST POPULAR
              </div>
              
              {/* Top Badge */}
              <div className="flex items-center mb-6">
                <div className="icon-circle" style={{ background: 'rgba(37, 99, 235, 0.2)', border: '1px solid rgba(37, 99, 235, 0.3)' }}>
                  <i className="fas fa-bolt text-blue-400 text-sm"></i>
                </div>
                <h3 className="ml-3 text-xl text-white font-medium">Professional</h3>
              </div>
              
              {/* Price */}
              <div className="mt-2 mb-6">
                <div className="flex items-baseline">
                  <span className="text-4xl font-[200] text-white">$49</span>
                  <span className="text-sm text-white/60 ml-2">/month</span>
                </div>
                <p className="text-white/60 text-sm mt-1">For teams with advanced AI needs</p>
              </div>
              <div className="card-divider w-full mb-6"></div>
              
              {/* Features */}
              <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-center text-white/90 text-base">
                  <i className="fas fa-check text-emerald-400 mr-4 text-sm"></i>
                  <span>10 million tokens/month</span>
                </li>
                <li className="flex items-center text-white/90 text-base">
                  <i className="fas fa-check text-emerald-400 mr-4 text-sm"></i>
                  <span>20 custom AI models</span>
                </li>
                <li className="flex items-center text-white/90 text-base">
                  <i className="fas fa-check text-emerald-400 mr-4 text-sm"></i>
                  <span>Advanced API access</span>
                </li>
                <li className="flex items-center text-white/90 text-base">
                  <i className="fas fa-check text-emerald-400 mr-4 text-sm"></i>
                  <span>Priority support</span>
                </li>
                <li className="flex items-center text-white/90 text-base">
                  <i className="fas fa-check text-emerald-400 mr-4 text-sm"></i>
                  <span>Basic custom training</span>
                </li>
                <li className="flex items-center text-white/50 text-base">
                  <i className="fas fa-times text-white/30 mr-4 text-sm"></i>
                  <span>No dedicated resources</span>
                </li>
              </ul>
              
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 my-6">
                <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-[300] text-white">99.95%</div>
                  <div className="text-xs text-white/60 mt-1">Uptime</div>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-[300] text-white">80ms</div>
                  <div className="text-xs text-white/60 mt-1">Latency</div>
                </div>
              </div>
              
              {/* CTA */}
              <button className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all duration-300">
                Get Started
              </button>
              <p className="text-white/50 text-sm text-center mt-4">14-day free trial included</p>
            </div>
            
            {/* Enterprise Plan */}
<div className="glass-effect bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl shadow-xl p-6 flex flex-col h-full relative hover:bg-white/10 transition-all duration-300 min-w-0 overflow-hidden">
              {/* Top Badge */}
              <div className="flex items-center mb-6">
                <div className="icon-circle">
                  <i className="fas fa-building text-indigo-400 text-sm"></i>
                </div>
                <h3 className="ml-3 text-xl text-white font-medium">Enterprise</h3>
              </div>
              
              {/* Price */}
              <div className="mt-2 mb-6">
                <div className="flex items-baseline">
                  <span className="text-4xl font-[200] text-white">$199</span>
                  <span className="text-sm text-white/60 ml-2">/month</span>
                </div>
                <p className="text-white/60 text-sm mt-1">For organizations with advanced requirements</p>
              </div>
              <div className="card-divider w-full mb-6"></div>
              
              {/* Features */}
              <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-center text-white/90 text-base">
                  <i className="fas fa-check text-emerald-400 mr-4 text-sm"></i>
                  <span>Unlimited tokens</span>
                </li>
                <li className="flex items-center text-white/90 text-base">
                  <i className="fas fa-check text-emerald-400 mr-4 text-sm"></i>
                  <span>Unlimited custom AI models</span>
                </li>
                <li className="flex items-center text-white/90 text-base">
                  <i className="fas fa-check text-emerald-400 mr-4 text-sm"></i>
                  <span>Full API ecosystem</span>
                </li>
                <li className="flex items-center text-white/90 text-base">
                  <i className="fas fa-check text-emerald-400 mr-4 text-sm"></i>
                  <span>24/7 dedicated support</span>
                </li>
                <li className="flex items-center text-white/90 text-base">
                  <i className="fas fa-check text-emerald-400 mr-4 text-sm"></i>
                  <span>Advanced custom training</span>
                </li>
                <li className="flex items-center text-white/90 text-base">
                  <i className="fas fa-check text-emerald-400 mr-4 text-sm"></i>
                  <span>Dedicated resources</span>
                </li>
              </ul>
              
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 my-6">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-[300] text-white">99.99%</div>
                  <div className="text-xs text-white/60 mt-1">Uptime</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-[300] text-white">50ms</div>
                  <div className="text-xs text-white/60 mt-1">Latency</div>
                </div>
              </div>
              
              {/* CTA */}
              <button className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium transition-all duration-300 border border-white/20 hover:border-white/30">
                Contact Sales
              </button>
              <p className="text-white/50 text-sm text-center mt-4">Custom pricing available</p>
            </div>
          </div>
          
          {/* Bottom Text */}
          <div className="mt-20 text-center max-w-4xl">
            <p className="text-white/60 text-lg mb-8">All plans include core features: Standard AI models, REST API, 99.9% uptime SLA, Standard encryption, and Community access.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <span className="text-sm text-white/70 px-4 py-2 rounded-full bg-white/5 border border-white/10">GDPR COMPLIANT</span>
              <span className="text-sm text-white/70 px-4 py-2 rounded-full bg-white/5 border border-white/10">SOC 2 CERTIFIED</span>
              <span className="text-sm text-white/70 px-4 py-2 rounded-full bg-white/5 border border-white/10">HIPAA READY</span>
              <span className="text-sm text-white/70 px-4 py-2 rounded-full bg-white/5 border border-white/10">ISO 27001</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LandingPage2;