import React, { useEffect, useRef, useState } from 'react';
import { copyToClipboard } from '@/utils/browserCompat';

interface AnimatedBackgroundProps {
  opacity?: number; // 0-1, default 1
  enabled?: boolean; // default true
  className?: string;
  debug?: boolean; // Show debug overlay
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  opacity = 1,
  enabled = true,
  className = '',
  debug = false, // Disable debug by default
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [debugMode, setDebugMode] = useState(debug);
  const debugModeRef = useRef(debug);

  // Toggle debug mode with Ctrl+Shift+D
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setDebugMode(prev => {
          console.log(
            `🎨 AnimatedBackground Debug Mode: ${!prev ? 'ON' : 'OFF'}`
          );
          return !prev;
        });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    debugModeRef.current = debugMode;
  }, [debugMode]);

  // Determine quality immediately (synchronous) to avoid re-renders
  const getDeviceQuality = (): {
    shouldRender: boolean;
    quality: 'high' | 'medium' | 'low';
  } => {
    // Detect mobile devices
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    if (isMobile) {
      return { shouldRender: false, quality: 'low' };
    }

    // Detect low-end devices based on hardware concurrency and memory
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;
    const deviceMemory = (navigator as any).deviceMemory || 4;

    if (hardwareConcurrency <= 2 || deviceMemory <= 2) {
      return { shouldRender: true, quality: 'low' };
    } else if (hardwareConcurrency <= 4 || deviceMemory <= 4) {
      return { shouldRender: true, quality: 'medium' };
    }

    return { shouldRender: true, quality: 'high' };
  };

  const deviceConfig = getDeviceQuality();

  // Respect prefers-reduced-motion for accessibility & Safari perf
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [shouldRender, setShouldRender] = useState(
    deviceConfig.shouldRender && !prefersReducedMotion
  );
  const [quality] = useState(deviceConfig.quality);
  const [fps, setFps] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPausedState, setIsPausedState] = useState(false);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const isPausedRef = useRef(false);
  const animationIdRef = useRef<number | null>(null);
  const frozenTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !shouldRender) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: quality === 'high',
      powerPreference: quality === 'high' ? 'high-performance' : 'low-power',
    });

    if (!gl) {
      console.warn('WebGL not supported, animated background disabled');
      setShouldRender(false);
      return;
    }

    // Adjust animation speed and complexity based on quality
    const qualitySettings = {
      high: { speed: 0.2, linesPerGroup: 16, resolution: 1.0 },
      medium: { speed: 0.15, linesPerGroup: 12, resolution: 0.75 },
      low: { speed: 0.1, linesPerGroup: 8, resolution: 0.5 },
    };

    const settings = qualitySettings[quality];

    const vsSource = `
      attribute vec4 aVertexPosition;
      void main() {
        gl_Position = aVertexPosition;
      }
    `;

    const fsSource = `
      precision ${quality === 'high' ? 'highp' : 'mediump'} float;
      uniform vec2 iResolution;
      uniform float iTime;

      const float overallSpeed = ${settings.speed.toFixed(1)};
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
      const int linesPerGroup = ${settings.linesPerGroup};

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
        // Noticeable dark blue gradient - modern landing page style
        vec3 a = vec3(0.1, 0.15, 0.25);   // Dark blue base
        vec3 b = vec3(0.2, 0.25, 0.3);    // Blue variation - more visible
        vec3 c = vec3(1.0, 1.0, 0.8);     // Smooth cycling
        vec3 d = vec3(0.0, 0.15, 0.35);   // Blue-cyan phase
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

        vec3 bgColor1 = colorPalette(iTime * 0.05);
        vec3 bgColor2 = colorPalette(iTime * 0.05 + 0.33);

        fragColor = vec4(mix(bgColor1, bgColor2, uv.x), 1.0);
        // Dark but visible - professional gradient
        fragColor.rgb *= 0.4 + 0.5 * verticalFade;  // Noticeable but not bright
        fragColor.a = 1.0;

        gl_FragColor = fragColor;
      }
    `;

    function initShaderProgram(
      gl: WebGLRenderingContext,
      vsSource: string,
      fsSource: string
    ): WebGLProgram | null {
      const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
      const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

      if (!vertexShader || !fragmentShader) return null;

      const shaderProgram = gl.createProgram();
      if (!shaderProgram) return null;

      gl.attachShader(shaderProgram, vertexShader);
      gl.attachShader(shaderProgram, fragmentShader);
      gl.linkProgram(shaderProgram);

      if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error(
          'Unable to initialize the shader program: ' +
            gl.getProgramInfoLog(shaderProgram)
        );
        return null;
      }

      return shaderProgram;
    }

    function loadShader(
      gl: WebGLRenderingContext,
      type: number,
      source: string
    ): WebGLShader | null {
      const shader = gl.createShader(type);
      if (!shader) return null;

      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(
          'An error occurred compiling the shaders: ' +
            gl.getShaderInfoLog(shader)
        );
        gl.deleteShader(shader);
        return null;
      }

      return shader;
    }

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    if (!shaderProgram) {
      console.warn('Failed to initialize shader program');
      return;
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0];
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
      // Use resolution multiplier for performance optimization
      canvas.width = window.innerWidth * settings.resolution;
      canvas.height = window.innerHeight * settings.resolution;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const startTime = Date.now();
    let localFrameCount = 0;
    let lastFpsCheck = Date.now();

    setIsAnimating(true);

    function render() {
      if (!gl || !canvas) {
        if (debugModeRef.current) {
          console.error('AnimatedBackground: Canvas or GL context lost!');
        }
        return;
      }

      // FPS monitoring
      localFrameCount++;
      const now = Date.now();
      if (debugModeRef.current && now - lastFpsCheck > 1000) {
        const currentFps = localFrameCount;
        setFps(currentFps);
        setFrameCount(prev => prev + localFrameCount);
        localFrameCount = 0;
        lastFpsCheck = now;

        if (currentFps < 20 && quality !== 'low') {
          console.warn('Low FPS detected, consider reducing quality');
        }
      } else if (now - lastFpsCheck > 1000) {
        localFrameCount = 0;
        lastFpsCheck = now;
      }

      // Calculate time - freeze when paused using ref
      let currentTime: number;
      if (isPausedRef.current) {
        // When paused, freeze time at current value
        if (frozenTimeRef.current === null) {
          frozenTimeRef.current = (Date.now() - startTime) / 1000;
        }
        currentTime = frozenTimeRef.current;
      } else {
        // When playing, calculate normally
        frozenTimeRef.current = null;
        currentTime = (Date.now() - startTime) / 1000;
      }
      if (debugModeRef.current) {
        setCurrentTime(currentTime);
      }

      // Render
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(programInfo.program);
      gl.uniform2f(
        programInfo.uniformLocations.resolution,
        canvas.width,
        canvas.height
      );
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

      // Continue loop only if not paused (check ref directly)
      if (!isPausedRef.current) {
        animationIdRef.current = requestAnimationFrame(render);
      }
    }

    if (debugModeRef.current) {
      console.log('AnimatedBackground: Starting animation loop...');
    }

    // Store references on the GL context for resume functionality
    (gl as any).__shaderProgram = shaderProgram;
    (gl as any).__programInfo = {
      resolution: programInfo.uniformLocations.resolution,
      time: programInfo.uniformLocations.time,
      vertexPosition: programInfo.attribLocations.vertexPosition,
    };
    (gl as any).__positionBuffer = positionBuffer;
    (gl as any).__startTime = startTime;
    (gl as any).__render = render;

    animationIdRef.current = requestAnimationFrame(render);

    return () => {
      if (debugModeRef.current) {
        console.log('AnimatedBackground: Cleanup called - stopping animation');
      }
      setIsAnimating(false);
      window.removeEventListener('resize', resizeCanvas);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      if (gl && shaderProgram) {
        gl.deleteProgram(shaderProgram);
      }
      if (gl && positionBuffer) {
        gl.deleteBuffer(positionBuffer);
      }
    };
  }, [enabled, shouldRender, quality, opacity]);

  if (!enabled || !shouldRender) {
    return null;
  }

  // Helper function to generate color preview (mimics shader colorPalette)
  const getColorAtTime = (t: number) => {
    const a = [0.1, 0.15, 0.25];
    const b = [0.2, 0.25, 0.3];
    const c = [1.0, 1.0, 0.8];
    const d = [0.0, 0.15, 0.35];

    const r = a[0] + b[0] * Math.cos(6.28318 * (c[0] * t + d[0]));
    const g = a[1] + b[1] * Math.cos(6.28318 * (c[1] * t + d[1]));
    const bl = a[2] + b[2] * Math.cos(6.28318 * (c[2] * t + d[2]));

    // Apply same brightness factor as shader
    const brightness = 0.4 + 0.5 * 0.7; // approximate verticalFade
    return {
      r: Math.max(0, Math.min(255, Math.floor(r * brightness * 255))),
      g: Math.max(0, Math.min(255, Math.floor(g * brightness * 255))),
      b: Math.max(0, Math.min(255, Math.floor(bl * brightness * 255))),
    };
  };

  // Generate color samples for preview - synced with canvas using same frozen time
  const colorSamples = React.useMemo(() => {
    const samples = [];
    // Use frozen time if paused, otherwise use current time
    const timeToUse =
      frozenTimeRef.current !== null ? frozenTimeRef.current : currentTime;

    // First box shows CURRENT canvas color (what you see right now)
    // Then show future colors progressing to the right
    const currentColorTime = timeToUse * 0.05;

    for (let i = 0; i < 12; i++) {
      // Start from current time and show future progression
      const t = currentColorTime + i * 0.5; // Smaller increment for smoother preview
      const color = getColorAtTime(t);
      samples.push(`rgb(${color.r}, ${color.g}, ${color.b})`);
    }
    return samples;
  }, [currentTime, frozenTimeRef.current]);

  const toggleColorSelection = (color: string) => {
    setSelectedColors(prev =>
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    );
  };

  const copySelectedColors = async () => {
    const colorsText = selectedColors.join(', ');
    const ok = await copyToClipboard(colorsText);
    if (ok) {
      console.log('Copied to clipboard:', colorsText);
      alert(`Copied ${selectedColors.length} colors to clipboard!`);
    } else {
      alert('Failed to copy — try again');
    }
  };

  const copyAllColors = async () => {
    const colorsText = colorSamples.join(', ');
    const ok = await copyToClipboard(colorsText);
    if (ok) {
      console.log('Copied all colors to clipboard:', colorsText);
      alert(`Copied all ${colorSamples.length} colors to clipboard!`);
    } else {
      alert('Failed to copy — try again');
    }
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`fixed top-0 left-0 w-full h-full block pointer-events-none ${className}`}
        style={{
          opacity,
          zIndex: 0,
          willChange: 'transform',
          transform: 'translateZ(0)', // Force GPU compositing on Safari
        }}
      />

      {/* Debug Overlay - Toggle with Ctrl+Shift+D */}
      {debugMode && (
        <div
          className="fixed top-4 right-4 z-50 bg-black/90 text-white p-4 rounded-lg border border-green-500 font-mono text-xs pointer-events-none"
          style={{ backdropFilter: 'blur(10px)' }}
        >
          <div className="font-bold text-green-400 mb-3">
            🎨 AnimatedBackground Debug
          </div>
          <div>
            Status:{' '}
            <span className={isAnimating ? 'text-green-400' : 'text-red-400'}>
              {isAnimating ? '✅ RUNNING' : '❌ STOPPED'}
            </span>
          </div>
          <div>
            FPS: <span className="text-yellow-400">{fps}</span>
          </div>
          <div>
            Frames: <span className="text-blue-400">{frameCount}</span>
          </div>
          <div>
            Quality: <span className="text-purple-400">{quality}</span>
          </div>
          <div>
            Opacity: <span className="text-cyan-400">{opacity.toFixed(2)}</span>
          </div>
          <div>
            Enabled:{' '}
            <span className={enabled ? 'text-green-400' : 'text-red-400'}>
              {enabled ? 'YES' : 'NO'}
            </span>
          </div>
          <div>
            Should Render:{' '}
            <span className={shouldRender ? 'text-green-400' : 'text-red-400'}>
              {shouldRender ? 'YES' : 'NO'}
            </span>
          </div>

          {/* Controls */}
          <div className="mt-3 pt-3 border-t border-green-500/30">
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => {
                  const newPausedState = !isPausedState;
                  setIsPausedState(newPausedState);
                  isPausedRef.current = newPausedState;

                  // If unpausing, restart the animation loop using the main render function
                  if (!newPausedState) {
                    const canvas = canvasRef.current;
                    if (!canvas) return;

                    const gl = canvas.getContext('webgl');
                    if (!gl) return;

                    // Use the stored render function to maintain sync
                    const render = (gl as any).__render;
                    if (render) {
                      animationIdRef.current = requestAnimationFrame(render);
                    }
                  }
                }}
                className={`px-3 py-1 rounded text-xs font-bold ${
                  isPausedState
                    ? 'bg-green-500 text-black'
                    : 'bg-red-500 text-white'
                }`}
              >
                {isPausedState ? '▶ PLAY' : '⏸ PAUSE'}
              </button>
              <button
                onClick={copySelectedColors}
                disabled={selectedColors.length === 0}
                className="px-3 py-1 rounded text-xs font-bold bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                title="Copy selected colors to clipboard"
              >
                📋 Copy ({selectedColors.length})
              </button>
              <button
                onClick={copyAllColors}
                className="px-3 py-1 rounded text-xs font-bold bg-purple-500 text-white"
                title="Copy all colors to clipboard"
              >
                📋 All
              </button>
            </div>
          </div>

          {/* Color Preview Strip */}
          <div className="mt-3 pt-3 border-t border-green-500/30">
            <div className="font-bold text-green-400 mb-2">
              Color Cycle Preview:
            </div>
            <div className="text-gray-400 text-[10px] mb-2">
              Click colors to select/deselect
            </div>
            <div className="flex gap-1 mb-2 flex-wrap">
              {colorSamples.map((color, i) => (
                <div
                  key={i}
                  onClick={() => toggleColorSelection(color)}
                  className={`w-8 h-8 border-2 cursor-pointer transition-all ${
                    selectedColors.includes(color)
                      ? 'border-yellow-400 scale-110'
                      : 'border-white/20 hover:border-white/60'
                  }`}
                  style={{ backgroundColor: color }}
                  title={`${color} - Click to ${selectedColors.includes(color) ? 'deselect' : 'select'}`}
                />
              ))}
            </div>
            <div className="text-gray-400 text-[10px] mb-2">
              ⬅ Current color | Future colors ➡
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AnimatedBackground;
