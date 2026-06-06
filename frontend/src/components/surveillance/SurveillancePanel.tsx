'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Maximize2, Power, PowerOff, X, Activity, User, Truck, Move } from 'lucide-react';
import { cn } from '@/lib/utils';

const CAMERAS = [
  { id: 1, name: 'Main Gate', location: 'Main Entrance' },
  { id: 2, name: 'Parking Lot', location: 'Underground Parking' },
  { id: 3, name: 'Tower A Lobby', location: 'Tower A - Ground Floor' },
  { id: 4, name: 'Community Garden', location: 'Garden Area' },
];

const VEHICLE_CLASSES = new Set(['car', 'truck', 'bus', 'motorcycle', 'bicycle']);
const MOTION_THRESHOLD = 0.12;

export default function SurveillancePanel() {
  const [isOn, setIsOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [fullscreenCam, setFullscreenCam] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [activeDetections, setActiveDetections] = useState<{ type: string; confidence: number; title: string }[]>([]);
  const [mounted, setMounted] = useState(false);

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const modelRef = useRef<any>(null);
  const detectionTimer = useRef<NodeJS.Timeout | null>(null);
  const prevFrameData = useRef<ImageData | null>(null);
  const motionCanvas = useRef<HTMLCanvasElement | null>(null);
  const sourceVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date().toLocaleTimeString());
    const clock = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => {
      clearInterval(clock);
      stopDetection();
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    if (stream) {
      videoRefs.current.forEach(ref => { if (ref) ref.srcObject = stream; });
      sourceVideoRef.current = videoRefs.current[0] || null;
    }
  }, [stream]);

  const stopDetection = () => {
    if (detectionTimer.current) { clearInterval(detectionTimer.current); detectionTimer.current = null; }
    modelRef.current = null;
    prevFrameData.current = null;
  };

  const checkMotion = (video: HTMLVideoElement): number | null => {
    if (!motionCanvas.current) motionCanvas.current = document.createElement('canvas');
    const canvas = motionCanvas.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const w = 160, h = 120;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    const current = ctx.getImageData(0, 0, w, h);

    if (prevFrameData.current) {
      let diff = 0;
      const total = current.data.length;
      for (let i = 0; i < total; i += 16) {
        const dr = Math.abs(current.data[i] - prevFrameData.current.data[i]);
        const dg = Math.abs(current.data[i + 1] - prevFrameData.current.data[i + 1]);
        const db = Math.abs(current.data[i + 2] - prevFrameData.current.data[i + 2]);
        if (dr > 25 || dg > 25 || db > 25) diff++;
      }
      const ratio = diff / (total / 16);
      prevFrameData.current = current;
      if (ratio > MOTION_THRESHOLD) return Math.min(Math.round(ratio * 100), 99);
      return null;
    }
    prevFrameData.current = current;
    return null;
  };

  const runDetectionCycle = useCallback(async () => {
    const video = sourceVideoRef.current;
    if (!video || video.readyState < 2) return;

    const results: { type: string; confidence: number; title: string }[] = [];

    if (modelRef.current) {
      try {
        const predictions = await modelRef.current.detect(video);
        for (const p of predictions) {
          if (p.class === 'person') {
            results.push({ type: 'person', confidence: Math.round(p.score * 100), title: 'Person Detected' });
          } else if (VEHICLE_CLASSES.has(p.class)) {
            results.push({ type: 'vehicle', confidence: Math.round(p.score * 100), title: 'Vehicle Detected' });
          }
        }
      } catch (_) {}
    }

    if (results.length === 0) {
      const motionConf = checkMotion(video);
      if (motionConf !== null) {
        results.push({ type: 'motion', confidence: motionConf, title: 'Movement Detected' });
      }
    }

    setActiveDetections(results);
  }, []);

  const startCamera = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      setStream(s);
      setIsOn(true);

      setTimeout(async () => {
        setModelLoading(true);
        try {
          const cocoSsd = require('@tensorflow-models/coco-ssd');
          modelRef.current = await cocoSsd.load();
          detectionTimer.current = setInterval(runDetectionCycle, 1000);
        } catch (_) {
          detectionTimer.current = setInterval(() => {
            const video = sourceVideoRef.current;
            if (!video || video.readyState < 2) return;
            const motionConf = checkMotion(video);
            setActiveDetections(motionConf !== null
              ? [{ type: 'motion', confidence: motionConf, title: 'Movement Detected' }]
              : []
            );
          }, 1000);
        }
        setModelLoading(false);
      }, 500);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera access denied. Please allow webcam permission.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera detected on this device.');
      } else {
        setError(`Failed to access camera: ${err.message}`);
      }
    }
    setConnecting(false);
  }, [runDetectionCycle]);

  const stopCamera = useCallback(() => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    stopDetection();
    setStream(null);
    setIsOn(false);
    videoRefs.current.forEach(ref => { if (ref) ref.srcObject = null; });
    setActiveDetections([]);
  }, [stream]);

  const setVideoRef = (i: number) => (el: HTMLVideoElement | null) => { videoRefs.current[i] = el; };

  if (!mounted) return null;

  return (
    <>
      <div className="glass-card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="section-title">Camera Controls</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn('w-2 h-2 rounded-full', isOn ? 'bg-secondary-500 animate-pulse' : 'bg-surface-400')} />
              <span className={cn('text-xs font-medium', isOn ? 'text-secondary-500' : 'text-surface-400')}>
                {isOn ? '● Live' : '○ Offline'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isOn ? (
              <button onClick={startCamera} disabled={connecting}
                className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                {connecting ? (
                  <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Connecting...</>
                ) : (
                  <><Power className="w-4 h-4" /> Turn On Camera</>
                )}
              </button>
            ) : (
              <>
                <button onClick={() => CAMERAS.length > 0 && setFullscreenCam(CAMERAS[0].id)}
                  className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm">
                  <Maximize2 className="w-4 h-4" /> Full Screen
                </button>
                <button onClick={stopCamera}
                  className="bg-danger-500 hover:bg-danger-600 text-white flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                  <PowerOff className="w-4 h-4" /> Turn Off Camera
                </button>
              </>
            )}
          </div>
        </div>
        {error && (
          <div className="mt-3 p-3 rounded-xl bg-danger-50 dark:bg-danger-500/10 text-danger-600 dark:text-danger-400 text-sm flex items-center gap-2">
            <X className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">Live Camera Feeds</h3>
          {isOn && (
            <div className="flex items-center gap-1.5 text-xs text-secondary-400">
              <Activity className="w-3.5 h-3.5" />
              {CAMERAS.length} cameras online
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {CAMERAS.map((cam, i) => (
            <div key={cam.id}
              className={cn(
                'relative rounded-xl overflow-hidden bg-surface-900 aspect-video group cursor-pointer transition-all duration-300',
                isOn && 'ring-1 ring-secondary-500/20 hover:ring-secondary-500/50'
              )}
              onClick={() => { if (isOn) setFullscreenCam(cam.id); }}
            >
              {isOn && stream ? (
                <video ref={setVideoRef(i)} autoPlay playsInline muted
                  className="w-full h-full object-cover transition-opacity duration-500" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="w-10 h-10 text-surface-700" />
                  <div className="absolute inset-0 bg-gradient-to-br from-surface-800/50 to-surface-900/80" />
                </div>
              )}
              <div className="absolute top-2 left-2 z-10">
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
                  <span className={cn('w-1.5 h-1.5 rounded-full', isOn ? 'bg-secondary-500 animate-pulse' : 'bg-surface-500')} />
                  <span className="text-[10px] text-white font-semibold tracking-wide">
                    {isOn ? 'LIVE' : 'OFFLINE'}
                  </span>
                </div>
              </div>
              {isOn && (
                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); setFullscreenCam(cam.id); }}
                    className="p-1.5 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-black/80 transition-colors">
                    <Maximize2 className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white font-semibold">{cam.name}</p>
                  {isOn && <span className="text-[10px] text-secondary-300 font-mono">{currentTime}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
        {!isOn && (
          <div className="text-center py-10 text-surface-400 text-sm">
            <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Click &quot;Turn On Camera&quot; to start live feed</p>
          </div>
        )}
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">AI Detection</h3>
          {isOn && modelLoading && <span className="text-xs text-surface-400">Loading detection model...</span>}
        </div>
        {!isOn ? (
          <div className="text-center py-8 text-surface-400 text-sm">Camera is off</div>
        ) : activeDetections.length === 0 ? (
          <div className="text-center py-8 text-surface-400 text-sm">No active AI detection events</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {activeDetections.map((d, i) => (
              <div key={d.type}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50"
                style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    d.type === 'person' && 'bg-secondary-50 dark:bg-secondary-500/10 text-secondary-500',
                    d.type === 'vehicle' && 'bg-warning-50 dark:bg-warning-500/10 text-warning-500',
                    d.type === 'motion' && 'bg-primary-50 dark:bg-primary-500/10 text-primary-500',
                  )}>
                    {d.type === 'person' ? <User className="w-4 h-4" /> :
                     d.type === 'vehicle' ? <Truck className="w-4 h-4" /> :
                     <Move className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      {d.title}
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                        d.type === 'person' && 'bg-secondary-100 dark:bg-secondary-500/20 text-secondary-700 dark:text-secondary-400',
                        d.type === 'vehicle' && 'bg-warning-100 dark:bg-warning-500/20 text-warning-700 dark:text-warning-400',
                        d.type === 'motion' && 'bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400',
                      )}>
                        {d.confidence}%
                      </span>
                    </p>
                    <p className="text-xs text-surface-400">Location: {CAMERAS[0].name}</p>
                  </div>
                </div>
                <span className="text-[10px] text-surface-400 font-mono">{currentTime}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {fullscreenCam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={() => setFullscreenCam(null)}>
          <div className="relative w-full max-w-5xl mx-4 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video bg-surface-900 relative">
              <video ref={(el) => {
                if (el && stream && !el.srcObject) el.srcObject = stream;
              }} autoPlay playsInline muted
                className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4 z-10">
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2">
                  <span className="w-2 h-2 bg-secondary-500 rounded-full animate-pulse" />
                  <span className="text-sm text-white font-bold tracking-wide">LIVE</span>
                </div>
              </div>
              <div className="absolute top-4 right-4 z-10">
                <button onClick={() => setFullscreenCam(null)}
                  className="p-2 bg-black/60 backdrop-blur-sm rounded-xl hover:bg-black/80 transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="absolute bottom-4 left-4 z-10">
                <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2.5">
                  <p className="text-sm text-white font-semibold">
                    {CAMERAS.find(c => c.id === fullscreenCam)?.name} Camera
                  </p>
                  <p className="text-xs text-white/70 mt-0.5">{currentTime}</p>
                </div>
              </div>
              {activeDetections.length > 0 && (
                <div className="absolute bottom-4 right-4 z-10 flex gap-2 flex-wrap justify-end">
                  {activeDetections.map((d) => (
                    <span key={d.type} className={cn(
                      'text-[10px] px-2 py-1 rounded-lg font-medium backdrop-blur-sm',
                      d.type === 'person' && 'bg-secondary-500/80 text-white',
                      d.type === 'vehicle' && 'bg-warning-500/80 text-white',
                      d.type === 'motion' && 'bg-primary-500/80 text-white',
                    )}>
                      🟢 {d.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
