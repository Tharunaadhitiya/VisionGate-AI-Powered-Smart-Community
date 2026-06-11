'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Maximize2, Power, PowerOff, X, Activity, User, Truck, Move, Smartphone, Monitor, Wifi, WifiOff, AlertTriangle, RefreshCw, BarChart3, Clock, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const CAMERAS = [
  { id: 1, name: 'Main Gate', location: 'Main Entrance' },
  { id: 2, name: 'Parking Lot', location: 'Underground Parking' },
  { id: 3, name: 'Tower A Lobby', location: 'Tower A - Ground Floor' },
  { id: 4, name: 'Community Garden', location: 'Garden Area' },
];

const VEHICLE_CLASSES = new Set(['car', 'truck', 'bus', 'motorcycle', 'bicycle']);
const MOTION_THRESHOLD = 0.12;
const DEFAULT_MOBILE_URL = 'https://192.168.1.7:8080/video';
const COUNT_COOLDOWN_MS = 10000;

interface Detection {
  label: string;
  confidence: number;
  bbox?: number[];
}

interface DetectionLogEntry {
  id: number;
  time: string;
  label: string;
  confidence: number;
}

export default function SurveillancePanel() {
  const [isOn, setIsOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [fullscreenCam, setFullscreenCam] = useState<number | string | null>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [activeDetections, setActiveDetections] = useState<{ type: string; confidence: number; title: string }[]>([]);
  const [mounted, setMounted] = useState(false);

  const [mobileUrl, setMobileUrl] = useState(DEFAULT_MOBILE_URL);
  const [useHttps, setUseHttps] = useState(true);
  const [mobileOnline, setMobileOnline] = useState<boolean | null>(null);
  const [mobileStreamActive, setMobileStreamActive] = useState(false);
  const [laptopCamActive, setLaptopCamActive] = useState(false);
  const [mobileAlerts, setMobileAlerts] = useState<{ id: number; time: string; type: string; confidence: number; label: string }[]>([]);
  const [stats, setStats] = useState({ humans_today: 0, vehicles_today: 0, motion_events_today: 0 });
  const [mobileDetections, setMobileDetections] = useState<Detection[]>([]);
  const [streamError, setStreamError] = useState(false);
  const [detectionLog, setDetectionLog] = useState<DetectionLogEntry[]>([]);

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const modelRef = useRef<any>(null);
  const detectionTimer = useRef<NodeJS.Timeout | null>(null);
  const prevFrameData = useRef<ImageData | null>(null);
  const motionCanvas = useRef<HTMLCanvasElement | null>(null);
  const sourceVideoRef = useRef<HTMLVideoElement | null>(null);
  const lastCountedRef = useRef<{ person: number; vehicle: number; motion: number }>({ person: 0, vehicle: 0, motion: 0 });
  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);
  const mobileImgRef = useRef<HTMLImageElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const statusCheckRef = useRef<NodeJS.Timeout | null>(null);
  const analysisTimerRef = useRef<NodeJS.Timeout | null>(null);
  const alertIdRef = useRef(0);
  const statsPollRef = useRef<NodeJS.Timeout | null>(null);
  const imgLoadAttempts = useRef(0);
  const bboxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyzingRef = useRef(false);
  const logIdRef = useRef(0);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date().toLocaleTimeString());
    const clock = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => {
      clearInterval(clock);
      stopDetection();
      stopMobileStream();
      stopLaptopCam();
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

  const drawBoundingBoxes = (detections: Detection[]) => {
    const canvas = bboxCanvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const img = mobileImgRef.current;
    const video = mobileVideoRef.current;
    const srcWidth = img ? img.naturalWidth : video ? video.videoWidth : 640;
    const srcHeight = img ? img.naturalHeight : video ? video.videoHeight : 480;
    if (!srcWidth || !srcHeight) return;
    const scaleX = canvas.width / srcWidth;
    const scaleY = canvas.height / srcHeight;
    for (const d of detections) {
      if (!d.bbox || d.bbox.length < 4) continue;
      const [x1, y1, x2, y2] = d.bbox;
      const dx = x1 * scaleX;
      const dy = y1 * scaleY;
      const dw = (x2 - x1) * scaleX;
      const dh = (y2 - y1) * scaleY;
      const isPerson = d.label === 'person';
      ctx.strokeStyle = isPerson ? '#22c55e' : '#3b82f6';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(dx, dy, dw, dh);
      ctx.fillStyle = isPerson ? '#22c55e' : '#3b82f6';
      const label = `${d.label === 'person' ? 'Person' : d.label.charAt(0).toUpperCase() + d.label.slice(1)} ${d.confidence}%`;
      ctx.font = 'bold 13px monospace';
      const textW = ctx.measureText(label).width;
      ctx.fillRect(dx, dy - 22, textW + 10, 22);
      ctx.fillStyle = '#000000';
      ctx.fillText(label, dx + 5, dy - 7);
    }
  };

  const checkMotion = (video: HTMLVideoElement): number | null => {
    if (!motionCanvas.current) motionCanvas.current = document.createElement('canvas');
    const canvas = motionCanvas.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const w = 160, h = 120;
    canvas.width = w; canvas.height = h;
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
    setConnecting(true); setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      setStream(s); setIsOn(true);
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
            setActiveDetections(motionConf !== null ? [{ type: 'motion', confidence: motionConf, title: 'Movement Detected' }] : []);
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
    stopDetection(); setStream(null); setIsOn(false);
    videoRefs.current.forEach(ref => { if (ref) ref.srcObject = null; });
    setActiveDetections([]);
  }, [stream]);

  const setVideoRef = (i: number) => (el: HTMLVideoElement | null) => { videoRefs.current[i] = el; };

  const toggleUrlProtocol = () => {
    setUseHttps(!useHttps);
    setMobileUrl(prev => prev.startsWith('https') ? prev.replace('https', 'http') : prev.replace('http', 'https'));
  };

  const checkMobileStatus = useCallback(async () => {
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 3000);
      const url = mobileUrl.replace('/video', '/shot.jpg');
      await fetch(url, { method: 'HEAD', signal: controller.signal, mode: 'no-cors' });
      setMobileOnline(true);
      setStreamError(false);
      imgLoadAttempts.current = 0;
    } catch {
      if (mobileStreamActive) {
        imgLoadAttempts.current++;
        if (imgLoadAttempts.current > 3 && mobileOnline === true) {
          setStreamError(true);
        }
      }
      setMobileOnline(false);
    }
  }, [mobileUrl, mobileStreamActive, mobileOnline]);

  const pollStats = useCallback(async () => {
    try {
      const { data } = await api.get('/surveillance/mobile/analytics');
      if (data?.data) {
        console.log('[Analytics] Backend data:', data.data);
        setStats(prev => ({
          humans_today: Math.max(prev.humans_today, data.data.humans_today || 0),
          vehicles_today: Math.max(prev.vehicles_today, data.data.vehicles_today || 0),
          motion_events_today: Math.max(prev.motion_events_today, data.data.motion_events_today || 0),
        }));
      }
    } catch {}
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video = mobileVideoRef.current;
    const img = mobileImgRef.current;
    if (!video && !img) return null;
    if (!captureCanvasRef.current) captureCanvasRef.current = document.createElement('canvas');
    const canvas = captureCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    if (video && video.readyState >= 2) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else if (img && img.complete && img.naturalWidth > 0) {
      canvas.width = img.naturalWidth || 640;
      canvas.height = img.naturalHeight || 480;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } else {
      return null;
    }
    return canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
  }, []);

  const addAlert = (type: string, confidence: number, label: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const newAlert = { id: ++alertIdRef.current, time: timeStr, type, confidence, label };
    setMobileAlerts(prev => [newAlert, ...prev].slice(0, 50));
    api.post('/surveillance/mobile/alert', { type, confidence, detection_label: label, location: 'Mobile Camera Feed' }).catch(() => {});
  };

  const runFrameAnalysis = useCallback(async () => {
    if ((!mobileStreamActive && !laptopCamActive) || analyzingRef.current) return;
    analyzingRef.current = true;
    try {
      const frame = captureFrame();
      if (!frame) { analyzingRef.current = false; return; }
      const { data } = await api.post('/surveillance/mobile/detect', { image: frame }).catch(() => ({ data: null }));
      if (!data || !data.success) { analyzingRef.current = false; return; }
      const result = data.data;

      console.log('[Detection] Raw result:', result);

      const dets: Detection[] = [];
      if (result.detections) {
        for (const d of result.detections) {
          dets.push({
            label: d.label,
            confidence: Math.round(d.confidence * 100),
            bbox: d.bbox,
          });
        }
      }
      setMobileDetections(dets);
      drawBoundingBoxes(dets);

      for (const d of dets) {
        if (d.confidence > 50) {
          const type = d.label === 'person' ? 'person' : 'vehicle';
          const label = d.label === 'person' ? 'Human Detected' : `Vehicle Detected (${d.label})`;
          addAlert(type, d.confidence, label);
          const now = new Date();
          const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setDetectionLog(prev => [{ id: ++logIdRef.current, time: timeStr, label: d.label, confidence: d.confidence }, ...prev].slice(0, 50));
        }
      }
      if (result.has_motion && !dets.length) {
        addAlert('motion', Math.round(result.motion_score || 80), 'Motion Detected');
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setDetectionLog(prev => [{ id: ++logIdRef.current, time: timeStr, label: 'motion', confidence: Math.round(result.motion_score || 80) }, ...prev].slice(0, 50));
      }

      const now = Date.now();
      let newHumans = 0, newVehicles = 0, newMotion = 0;

      if (result.people_count > 0 && now - lastCountedRef.current.person > COUNT_COOLDOWN_MS) {
        newHumans = 1;
        lastCountedRef.current.person = now;
        console.log('[Analytics] Person counted');
      }
      if (result.vehicles > 0 && now - lastCountedRef.current.vehicle > COUNT_COOLDOWN_MS) {
        newVehicles = 1;
        lastCountedRef.current.vehicle = now;
        console.log('[Analytics] Vehicle counted');
      }
      if (result.has_motion && now - lastCountedRef.current.motion > COUNT_COOLDOWN_MS) {
        newMotion = 1;
        lastCountedRef.current.motion = now;
        console.log('[Analytics] Motion counted');
      }

      if (newHumans || newVehicles || newMotion) {
        setStats(prev => {
          const updated = {
            humans_today: prev.humans_today + newHumans,
            vehicles_today: prev.vehicles_today + newVehicles,
            motion_events_today: prev.motion_events_today + newMotion,
          };
          console.log('[Analytics] Updated:', updated);
          return updated;
        });
      }
    } catch {}
    analyzingRef.current = false;
  }, [mobileStreamActive, laptopCamActive]);

  const startMobileStream = () => {
    setStreamError(false);
    setMobileOnline(null);
    setDetectionLog([]);
    imgLoadAttempts.current = 0;
    lastCountedRef.current = { person: 0, vehicle: 0, motion: 0 };
    setMobileStreamActive(true);
    setLaptopCamActive(false);
    if (statusCheckRef.current) clearInterval(statusCheckRef.current);
    if (statsPollRef.current) clearInterval(statsPollRef.current);
    statusCheckRef.current = setInterval(checkMobileStatus, 5000);
    statsPollRef.current = setInterval(pollStats, 10000);
    setTimeout(() => {
      checkMobileStatus();
      pollStats();
    }, 2000);
  };

  const stopMobileStream = () => {
    setMobileStreamActive(false);
    setMobileOnline(null);
    setMobileDetections([]);
    setDetectionLog([]);
    setStreamError(false);
    setStats({ humans_today: 0, vehicles_today: 0, motion_events_today: 0 });
    imgLoadAttempts.current = 0;
    lastCountedRef.current = { person: 0, vehicle: 0, motion: 0 };
    analyzingRef.current = false;
    if (bboxCanvasRef.current) {
      const ctx = bboxCanvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, bboxCanvasRef.current.width, bboxCanvasRef.current.height);
    }
    if (mobileVideoRef.current) { mobileVideoRef.current.src = ''; }
    if (statusCheckRef.current) { clearInterval(statusCheckRef.current); statusCheckRef.current = null; }
    if (analysisTimerRef.current) { clearInterval(analysisTimerRef.current); analysisTimerRef.current = null; }
    if (statsPollRef.current) { clearInterval(statsPollRef.current); statsPollRef.current = null; }
  };

  const startLaptopCam = async () => {
    setMobileStreamActive(false);
    setMobileOnline(null);
    setStats({ humans_today: 0, vehicles_today: 0, motion_events_today: 0 });
    setDetectionLog([]);
    lastCountedRef.current = { person: 0, vehicle: 0, motion: 0 };
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
      setStream(s);
      setLaptopCamActive(true);
      setMobileOnline(true);
      if (mobileVideoRef.current) {
        mobileVideoRef.current.srcObject = s;
      }
      if (statusCheckRef.current) clearInterval(statusCheckRef.current);
      if (statsPollRef.current) clearInterval(statsPollRef.current);
      statusCheckRef.current = setInterval(() => setMobileOnline(true), 5000);
      statsPollRef.current = setInterval(pollStats, 10000);
      setTimeout(pollStats, 2000);
    } catch {
      setError('Could not access laptop webcam. Check permissions.');
    }
  };

  const stopLaptopCam = () => {
    if (laptopCamActive && stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setLaptopCamActive(false);
    setMobileOnline(null);
    setMobileDetections([]);
    setDetectionLog([]);
    analyzingRef.current = false;
    if (bboxCanvasRef.current) {
      const ctx = bboxCanvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, bboxCanvasRef.current.width, bboxCanvasRef.current.height);
    }
    if (mobileVideoRef.current) { mobileVideoRef.current.srcObject = null; }
    if (statusCheckRef.current) { clearInterval(statusCheckRef.current); statusCheckRef.current = null; }
    if (analysisTimerRef.current) { clearInterval(analysisTimerRef.current); analysisTimerRef.current = null; }
    if (statsPollRef.current) { clearInterval(statsPollRef.current); statsPollRef.current = null; }
  };

  useEffect(() => {
    if (mobileStreamActive || laptopCamActive) {
      const timer = setInterval(runFrameAnalysis, 2500);
      analysisTimerRef.current = timer;
      return () => clearInterval(timer);
    }
  }, [mobileStreamActive, laptopCamActive, runFrameAnalysis]);

  const mobileCamOn = mobileStreamActive || laptopCamActive;

  if (!mounted) return null;

  const VideoFeed = ({ onRef }: { onRef: (el: HTMLVideoElement | null) => void }) => {
    useEffect(() => {
      if (mobileStreamActive && mobileImgRef.current) {
        mobileImgRef.current.src = mobileUrl;
      }
    }, [mobileStreamActive, mobileUrl]);
    return mobileStreamActive ? (
      <img ref={mobileImgRef}
        onLoad={() => { setMobileOnline(true); setStreamError(false); imgLoadAttempts.current = 0; }}
        onError={() => { setMobileOnline(false); }}
        className="w-full h-full object-cover"
        alt="Mobile Camera Feed" />
    ) : (
      <video ref={onRef} autoPlay playsInline muted className="w-full h-full object-cover" />
    );
  };

  return (
    <>
      <div className="glass-card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="section-title">Camera Controls</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn('w-2 h-2 rounded-full', isOn ? 'bg-secondary-500 animate-pulse' : mobileCamOn ? 'bg-secondary-500 animate-pulse' : 'bg-surface-400')} />
              <span className={cn('text-xs font-medium', isOn || mobileCamOn ? 'text-secondary-500' : 'text-surface-400')}>
                {isOn || mobileCamOn ? '● Live' : '○ Offline'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!isOn && !mobileCamOn ? (
              <>
                <button onClick={startCamera} disabled={connecting}
                  className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                  {connecting ? (
                    <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Connecting...</>
                  ) : (
                    <><Monitor className="w-4 h-4" /> CCTV Cameras</>
                  )}
                </button>
                <button onClick={startMobileStream}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                  <Smartphone className="w-4 h-4" /> Start Mobile Camera
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setFullscreenCam('mobile')}
                  className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm">
                  <Maximize2 className="w-4 h-4" /> Full Screen
                </button>
                {mobileCamOn ? (
                  <button onClick={() => { stopMobileStream(); stopLaptopCam(); }}
                    className="bg-danger-500 hover:bg-danger-600 text-white flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                    <PowerOff className="w-4 h-4" /> Stop Mobile Camera
                  </button>
                ) : (
                  <button onClick={stopCamera}
                    className="bg-danger-500 hover:bg-danger-600 text-white flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                    <PowerOff className="w-4 h-4" /> Turn Off Camera
                  </button>
                )}
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
          <div className="flex items-center gap-3">
            {mobileCamOn && (
              <div className="flex items-center gap-1.5 text-xs">
                {mobileOnline === true ? (
                  <span className="flex items-center gap-1 text-secondary-500"><Wifi className="w-3.5 h-3.5" /> Camera Online</span>
                ) : mobileOnline === false ? (
                  <span className="flex items-center gap-1 text-danger-500"><WifiOff className="w-3.5 h-3.5" /> Camera Offline</span>
                ) : (
                  <span className="flex items-center gap-1 text-surface-400"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checking...</span>
                )}
              </div>
            )}
            {isOn && (
              <span className="flex items-center gap-1.5 text-xs text-secondary-400">
                <Activity className="w-3.5 h-3.5" /> {CAMERAS.length} cameras online
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {CAMERAS.map((cam, i) => (
            <div key={cam.id}
              className={cn('relative rounded-xl overflow-hidden bg-surface-900 aspect-video group cursor-pointer transition-all duration-300', isOn && 'ring-1 ring-secondary-500/20 hover:ring-secondary-500/50')}
              onClick={() => { if (isOn) setFullscreenCam(cam.id); }} >
              {isOn && stream ? (
                <video ref={setVideoRef(i)} autoPlay playsInline muted className="w-full h-full object-cover transition-opacity duration-500" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="w-10 h-10 text-surface-700" />
                  <div className="absolute inset-0 bg-gradient-to-br from-surface-800/50 to-surface-900/80" />
                </div>
              )}
              <div className="absolute top-2 left-2 z-10">
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
                  <span className={cn('w-1.5 h-1.5 rounded-full', isOn ? 'bg-secondary-500 animate-pulse' : 'bg-surface-500')} />
                  <span className="text-[10px] text-white font-semibold tracking-wide">{isOn ? 'LIVE' : 'OFFLINE'}</span>
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

          <div className={cn('relative rounded-xl overflow-hidden bg-surface-900 aspect-video group transition-all duration-300', mobileCamOn && 'ring-1 ring-indigo-500/30 hover:ring-indigo-500/60')}>
            {mobileCamOn ? (
              mobileStreamActive ? (
                <img ref={mobileImgRef} src={mobileUrl}
                  onLoad={() => { setMobileOnline(true); setStreamError(false); }}
                  onError={() => setMobileOnline(false)}
                  className="w-full h-full object-cover" alt="Mobile Camera" />
              ) : laptopCamActive ? (
                <video ref={(el) => { if (el && stream && !el.srcObject) el.srcObject = stream; mobileVideoRef.current = el; }}
                  autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : null
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Smartphone className="w-10 h-10 text-surface-700" />
                <div className="absolute inset-0 bg-gradient-to-br from-surface-800/50 to-surface-900/80" />
              </div>
            )}
            {mobileCamOn && (
              <canvas ref={bboxCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none z-20"
                style={{ imageRendering: 'crisp-edges' }} />
            )}
            <div className="absolute top-2 left-2 z-30">
              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
                <span className={cn('w-1.5 h-1.5 rounded-full', mobileOnline === true ? 'bg-secondary-500 animate-pulse' : 'bg-surface-500')} />
                <span className="text-[10px] text-white font-semibold tracking-wide">{mobileOnline === true ? 'LIVE' : mobileOnline === false ? 'OFFLINE' : 'IDLE'}</span>
              </div>
            </div>
            {mobileCamOn && (
              <div className="absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); setFullscreenCam('mobile'); }}
                  className="p-1.5 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-black/80 transition-colors">
                  <Maximize2 className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white font-semibold">Mobile Camera Feed</p>
                {mobileCamOn && <span className="text-[10px] text-secondary-300 font-mono">{currentTime}</span>}
              </div>
            </div>
            {mobileCamOn && mobileOnline === true && mobileDetections.length > 0 && (
              <div className="absolute bottom-10 left-2 right-2 z-30 flex gap-1 flex-wrap">
                {mobileDetections.map((d, i) => (
                  <span key={i} className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded font-medium backdrop-blur-sm',
                    d.label === 'person' ? 'bg-green-500/80 text-white' : 'bg-blue-500/80 text-white'
                  )}>
                    {d.label === 'person' ? 'Person' : d.label.charAt(0).toUpperCase() + d.label.slice(1)} {d.confidence}%
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {!isOn && !mobileCamOn && (
          <div className="text-center py-10 text-surface-400 text-sm">
            <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Click &quot;CCTV Cameras&quot; to use laptop webcam or &quot;Start Mobile Camera&quot; for IP Webcam</p>
          </div>
        )}
      </div>

      {mobileCamOn && (
        <>
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Mobile Camera Settings</h3>
              {streamError && (
                <span className="text-xs text-warning-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Stream unstable
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <input type="text" value={mobileUrl} onChange={e => setMobileUrl(e.target.value)}
                placeholder="https://192.168.1.7:8080/video"
                className="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-surface-800 border border-surface-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button onClick={toggleUrlProtocol}
                className="btn-secondary text-xs px-3 py-2 rounded-xl">
                {useHttps ? 'HTTPS' : 'HTTP'}
              </button>
              <button onClick={() => { checkMobileStatus(); }}
                className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl">
                <RefreshCw className="w-3 h-3" /> Test Connection
              </button>
              {!mobileStreamActive ? (
                <button onClick={startMobileStream}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors">
                  <Power className="w-3 h-3" /> Start
                </button>
              ) : (
                <button onClick={() => { stopMobileStream(); }}
                  className="bg-danger-500 hover:bg-danger-600 text-white flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors">
                  <PowerOff className="w-3 h-3" /> Stop
                </button>
              )}
              <button onClick={startLaptopCam}
                className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl">
                <Monitor className="w-3 h-3" /> Use Laptop Webcam
              </button>
            </div>
            {mobileOnline === true && (
              <div className="mt-2 text-xs text-secondary-500 flex items-center gap-1"> Camera Online</div>
            )}
            {mobileOnline === false && (
              <div className="mt-2 text-xs text-danger-500 flex items-center gap-1"> Camera Offline — Check the URL and ensure IP Webcam is running</div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="section-title">Live AI Detections</h3>
                <span className="text-xs text-surface-400">{mobileDetections.length > 0 ? `${mobileDetections.length} objects` : 'No detections'}</span>
              </div>
              {mobileDetections.length === 0 ? (
                <div className="text-center py-8 text-surface-400 text-sm">No objects detected. Point the camera at people or vehicles.</div>
              ) : (
                <div className="space-y-2">
                  {mobileDetections.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50"
                      style={{ animation: 'fadeIn 0.3s ease-out' }}>
                      <div className="flex items-center gap-3">
                        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center',
                          d.label === 'person' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500')}>
                          {d.label === 'person' ? <User className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white flex items-center gap-2">
                            <span className={cn('w-2 h-2 rounded-full inline-block', d.label === 'person' ? 'bg-green-500' : 'bg-blue-500')} />
                            {d.label === 'person' ? 'Human Detected' : 'Vehicle Detected'}
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                              d.label === 'person' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400')}>
                              {d.confidence}%
                            </span>
                          </p>
                          <p className="text-xs text-surface-400">
                            {d.label === 'person' ? 'Human' : `Type: ${d.label}`}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-surface-400 font-mono">{currentTime}</span>
                    </div>
                  ))}
                </div>
              )}

              {detectionLog.length > 0 && (
                <div className="mt-4 border-t border-surface-700 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <List className="w-4 h-4 text-surface-400" />
                    <h4 className="text-sm font-medium text-surface-300">Recent Detections</h4>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {detectionLog.slice(0, 15).map(entry => (
                      <div key={entry.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-surface-800/30 text-xs">
                        <div className="flex items-center gap-2">
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                            entry.label === 'person' ? 'bg-green-500' : entry.label === 'motion' ? 'bg-purple-500' : 'bg-blue-500')} />
                          <span className="text-surface-300">
                            {entry.label === 'person' ? 'Person' : entry.label === 'motion' ? 'Motion' : entry.label.charAt(0).toUpperCase() + entry.label.slice(1)}
                          </span>
                          <span className={cn('font-medium',
                            entry.label === 'person' ? 'text-green-400' : entry.label === 'motion' ? 'text-purple-400' : 'text-blue-400')}>
                            {entry.confidence}%
                          </span>
                        </div>
                        <span className="text-surface-500 font-mono">{entry.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="glass-card p-5">
                <h3 className="section-title mb-4">Analytics Today</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-surface-300">Humans Detected</span>
                    </div>
                    <span className="text-lg font-bold text-green-500">{stats.humans_today}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-surface-300">Vehicles Detected</span>
                    </div>
                    <span className="text-lg font-bold text-blue-500">{stats.vehicles_today}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                    <div className="flex items-center gap-2">
                      <Move className="w-4 h-4 text-purple-500" />
                      <span className="text-sm text-surface-300">Motion Events</span>
                    </div>
                    <span className="text-lg font-bold text-purple-500">{stats.motion_events_today}</span>
                  </div>
                </div>
              </div>

              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="section-title">Recent Alerts</h3>
                  <span className="text-xs text-surface-400">{mobileAlerts.length}</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {mobileAlerts.length === 0 ? (
                    <div className="text-center py-6 text-surface-400 text-xs">No alerts yet</div>
                  ) : (
                    mobileAlerts.slice(0, 10).map((a) => (
                      <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-50 dark:bg-surface-800/30">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                            a.type === 'person' ? 'bg-green-500' : a.type === 'vehicle' ? 'bg-blue-500' : 'bg-purple-500')} />
                          <span className="text-xs text-surface-300 truncate">{a.label}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className={cn('text-[10px] font-medium',
                            a.confidence > 85 ? 'text-green-500' : a.confidence > 60 ? 'text-yellow-500' : 'text-surface-400')}>
                            {a.confidence}%
                          </span>
                          <span className="text-[10px] text-surface-500">{a.time}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {isOn && !mobileCamOn && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">AI Detection</h3>
            {modelLoading && <span className="text-xs text-surface-400">Loading detection model...</span>}
          </div>
          {!isOn ? (
            <div className="text-center py-8 text-surface-400 text-sm">Camera is off</div>
          ) : activeDetections.length === 0 ? (
            <div className="text-center py-8 text-surface-400 text-sm">No active AI detection events</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activeDetections.map((d, i) => (
                <div key={d.type} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50"
                  style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  <div className="flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center',
                      d.type === 'person' && 'bg-green-500/10 text-green-500',
                      d.type === 'vehicle' && 'bg-blue-500/10 text-blue-500',
                      d.type === 'motion' && 'bg-purple-500/10 text-purple-500')}>
                      {d.type === 'person' ? <User className="w-4 h-4" /> : d.type === 'vehicle' ? <Truck className="w-4 h-4" /> : <Move className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium flex items-center gap-2">
                        {d.title}
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                          d.type === 'person' && 'bg-green-500/20 text-green-400',
                          d.type === 'vehicle' && 'bg-blue-500/20 text-blue-400',
                          d.type === 'motion' && 'bg-purple-500/20 text-purple-400')}>
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
      )}

      {fullscreenCam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={() => setFullscreenCam(null)}>
          <div className="relative w-full max-w-5xl mx-4 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video bg-surface-900 relative">
              {fullscreenCam === 'mobile' && mobileCamOn ? (
                mobileStreamActive ? (
                  <img src={mobileUrl} className="w-full h-full object-cover" alt="Mobile Camera Fullscreen" />
                ) : laptopCamActive ? (
                  <video ref={(el) => { if (el && stream && !el.srcObject) el.srcObject = stream; }}
                    autoPlay playsInline muted className="w-full h-full object-cover" />
                ) : null
              ) : (
                <video ref={(el) => { if (el && stream && !el.srcObject) el.srcObject = stream; }}
                  autoPlay playsInline muted className="w-full h-full object-cover" />
              )}
              {fullscreenCam === 'mobile' && mobileCamOn && (
                <canvas ref={bboxCanvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none z-20"
                  style={{ imageRendering: 'crisp-edges' }} />
              )}
              <div className="absolute top-4 left-4 z-30">
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2">
                  <span className="w-2 h-2 bg-secondary-500 rounded-full animate-pulse" />
                  <span className="text-sm text-white font-bold tracking-wide">LIVE</span>
                </div>
              </div>
              <div className="absolute top-4 right-4 z-30">
                <button onClick={() => setFullscreenCam(null)}
                  className="p-2 bg-black/60 backdrop-blur-sm rounded-xl hover:bg-black/80 transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="absolute bottom-4 left-4 z-30">
                <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2.5">
                  <p className="text-sm text-white font-semibold">
                    {fullscreenCam === 'mobile' ? 'Mobile Camera Feed' : `${CAMERAS.find(c => c.id === fullscreenCam)?.name || ''} Camera`}
                  </p>
                  <p className="text-xs text-white/70 mt-0.5">{currentTime}</p>
                </div>
              </div>
              {fullscreenCam === 'mobile' && mobileDetections.length > 0 && (
                <div className="absolute bottom-4 right-4 z-30 flex gap-2 flex-wrap justify-end">
                  {mobileDetections.map((d, i) => (
                    <span key={i} className={cn('text-[10px] px-2 py-1 rounded-lg font-medium backdrop-blur-sm',
                      d.label === 'person' ? 'bg-green-500/80 text-white' : 'bg-blue-500/80 text-white')}>
                      {d.label === 'person' ? 'Person' : d.label.charAt(0).toUpperCase() + d.label.slice(1)} — {d.confidence}%
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
