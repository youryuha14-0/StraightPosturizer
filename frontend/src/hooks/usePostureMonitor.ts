import { useEffect, useRef, useState, useCallback } from 'react';
import { evaluatePosture, getCalibrationValues, CalibrationData, PostureMetrics } from '../utils/postureCalc';
import { playChimeAlert } from '../utils/audioAlert';

/* eslint-disable @typescript-eslint/no-explicit-any */
// MediaPipe has no official TypeScript definitions — all interop goes through `any` intentionally.

declare global {
  interface Window {
    Pose: any;
    Camera: any;
  }
}

export interface MonitorConfig {
  sensitivity: number;   // 1 to 10
  alertDelay: number;    // seconds
  alertVisual: boolean;
  alertAudio: boolean;
  audioType: string;
}

export interface SessionSummary {
  startTime: string;
  endTime: string;
  totalDuration: number;          // seconds (wall clock)
  goodPostureDuration: number;    // seconds
  alertCount: number;
}

export type CameraError = 'camera-denied' | 'camera-failed' | null;

export function usePostureMonitor(config: MonitorConfig) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraError, setCameraError] = useState<CameraError>(null);
  const [calibrationData, setCalibrationData] = useState<CalibrationData | null>(null);
  const [metrics, setMetrics] = useState<PostureMetrics | null>(null);

  // Alert triggers
  const [isAlertActive, setIsAlertActive] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  // DOM + library handles
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poseRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const slouchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Live refs so the (stable) onResults callback always reads current values.
  // This is what allows posture scoring to start working the instant calibration
  // is captured, without rebinding the MediaPipe results handler.
  const configRef = useRef<MonitorConfig>(config);
  const calibrationRef = useRef<CalibrationData | null>(null);
  const isAlertActiveRef = useRef(false);
  const shouldCalibrateRef = useRef(false);

  // Track posture session history stats (frame based so the good/total ratio is accurate)
  const sessionStatsRef = useRef({
    startTime: 0,
    totalFrames: 0,
    goodFrames: 0,
    alertTimes: 0,
  });

  // Keep refs synced with the latest state/props
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { calibrationRef.current = calibrationData; }, [calibrationData]);
  useEffect(() => { isAlertActiveRef.current = isAlertActive; }, [isAlertActive]);

  // 1. Load MediaPipe Pose from CDN dynamically to prevent Next.js SSR / WASM bundler errors
  useEffect(() => {
    let active = true;

    async function loadScripts() {
      if (window.Pose && window.Camera) {
        if (active) setIsLoaded(true);
        return;
      }

      const loadScript = (src: string) => {
        return new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject();
          document.head.appendChild(script);
        });
      };

      try {
        // Load Camera Utilities first, then Pose Detection
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');

        if (active) {
          console.log('MediaPipe Pose & Camera SDKs loaded successfully from CDN.');
          setIsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load MediaPipe scripts from CDN:', err);
        if (active) setLoadError(true);
      }
    }

    loadScripts();

    return () => {
      active = false;
    };
  }, []);

  // 2. Play warning audio alert when triggered
  const triggerAudioAlert = useCallback(() => {
    if (configRef.current.alertAudio) {
      playChimeAlert(configRef.current.audioType, 0.6);
    }
  }, []);

  // 3. Pose Results Handler: computes scores, draws skeleton overlay, and tracks slouch timer.
  //    Stable across renders — all mutable inputs are read from refs.
  const onResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Draw the clean video frame onto canvas
    canvasCtx.clearRect(0, 0, width, height);
    canvasCtx.drawImage(results.image, 0, 0, width, height);

    if (!results.poseLandmarks) return;
    const landmarks = results.poseLandmarks;

    // Fulfill a pending calibration request using this frame's landmarks
    if (shouldCalibrateRef.current) {
      const baseline = getCalibrationValues(landmarks);
      if (baseline) {
        calibrationRef.current = baseline;
        setCalibrationData(baseline);
        console.log('Calibration successful:', baseline);
        playChimeAlert(configRef.current.audioType, 0.4);
        shouldCalibrateRef.current = false;
      }
      // If landmarks were incomplete, keep the request pending for the next frame.
    }

    // Evaluate posture against the live baseline
    let currentMetrics: PostureMetrics | null = null;
    const baseline = calibrationRef.current;
    if (baseline) {
      currentMetrics = evaluatePosture(landmarks, baseline, configRef.current.sensitivity);
      setMetrics(currentMetrics);

      // Update active session stats
      sessionStatsRef.current.totalFrames += 1;
      if (!currentMetrics.isSlouching) {
        sessionStatsRef.current.goodFrames += 1;
      }

      // Slouching timer state machine
      if (currentMetrics.isSlouching) {
        if (!isAlertActiveRef.current && !slouchTimerRef.current) {
          slouchTimerRef.current = setTimeout(() => {
            isAlertActiveRef.current = true;
            setIsAlertActive(true);
            setAlertCount((prev) => prev + 1);
            sessionStatsRef.current.alertTimes += 1;
            triggerAudioAlert();
            slouchTimerRef.current = null;
          }, configRef.current.alertDelay * 1000);
        }
      } else {
        // Upright posture: reset visual & audio trigger immediately
        if (slouchTimerRef.current) {
          clearTimeout(slouchTimerRef.current);
          slouchTimerRef.current = null;
        }
        if (isAlertActiveRef.current) {
          isAlertActiveRef.current = false;
          setIsAlertActive(false);
        }
      }
    }

    // Draw skeleton landmarks on webcam canvas overlay
    canvasCtx.lineWidth = 4;

    const drawPoint = (landmark: any, color: string, radius = 6) => {
      canvasCtx.beginPath();
      canvasCtx.arc(landmark.x * width, landmark.y * height, radius, 0, 2 * Math.PI);
      canvasCtx.fillStyle = color;
      canvasCtx.fill();
    };

    const drawLine = (pt1: any, pt2: any, color: string) => {
      canvasCtx.beginPath();
      canvasCtx.moveTo(pt1.x * width, pt1.y * height);
      canvasCtx.lineTo(pt2.x * width, pt2.y * height);
      canvasCtx.strokeStyle = color;
      canvasCtx.stroke();
    };

    const skeletonColor = currentMetrics
      ? currentMetrics.isSlouching
        ? '#EF4444'
        : currentMetrics.overallScore < 85
          ? '#FBBF24'
          : '#10B981'
      : '#00F2FE'; // Neon cyan if not calibrated yet

    const nose = landmarks[0];
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];

    if (leftEar && rightEar) drawLine(leftEar, rightEar, skeletonColor);
    if (nose && leftEar) drawLine(nose, leftEar, skeletonColor);
    if (nose && rightEar) drawLine(nose, rightEar, skeletonColor);
    if (leftShoulder && rightShoulder) drawLine(leftShoulder, rightShoulder, skeletonColor);
    if (leftEar && leftShoulder) drawLine(leftEar, leftShoulder, skeletonColor);
    if (rightEar && rightShoulder) drawLine(rightEar, rightShoulder, skeletonColor);

    if (nose) drawPoint(nose, '#FFFFFF', 7);
    if (leftEar) drawPoint(leftEar, skeletonColor);
    if (rightEar) drawPoint(rightEar, skeletonColor);
    if (leftShoulder) drawPoint(leftShoulder, skeletonColor);
    if (rightShoulder) drawPoint(rightShoulder, skeletonColor);
  }, [triggerAudioAlert]);

  // 4. Start Posture Tracking
  const startMonitoring = useCallback(async () => {
    if (!isLoaded || !videoRef.current || !canvasRef.current) return;

    setCameraError(null);

    try {
      // Clear previous states
      setAlertCount(0);
      setIsAlertActive(false);
      isAlertActiveRef.current = false;
      shouldCalibrateRef.current = false;
      sessionStatsRef.current = {
        startTime: Date.now(),
        totalFrames: 0,
        goodFrames: 0,
        alertTimes: 0,
      };

      // Initialize Pose
      const pose = new window.Pose({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults(onResults);
      poseRef.current = pose;

      // Start webcam stream and connect to MediaPipe Camera helper
      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && poseRef.current) {
            await poseRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });

      await camera.start();
      cameraRef.current = camera;
      setIsAnalyzing(true);
      console.log('Webcam tracking started successfully.');
    } catch (e: any) {
      const name = e?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraError('camera-denied');
      } else {
        setCameraError('camera-failed');
      }
      console.error('Error starting camera or Pose model:', e);
    }
  }, [isLoaded, onResults]);

  // 5. Stop Posture Tracking and return session analytics
  const stopMonitoring = useCallback((): SessionSummary => {
    if (slouchTimerRef.current) {
      clearTimeout(slouchTimerRef.current);
      slouchTimerRef.current = null;
    }

    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }

    if (poseRef.current) {
      poseRef.current.close();
      poseRef.current = null;
    }

    setIsAnalyzing(false);
    setIsAlertActive(false);
    isAlertActiveRef.current = false;
    setMetrics(null);

    // Compute final session stats from wall-clock time + frame ratio
    const endTime = Date.now();
    const stats = sessionStatsRef.current;
    const totalDuration = Math.max(1, Math.round((endTime - stats.startTime) / 1000));
    const goodRatio = stats.totalFrames > 0 ? stats.goodFrames / stats.totalFrames : 1;
    const goodPostureDuration = Math.round(totalDuration * goodRatio);

    return {
      startTime: new Date(stats.startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      totalDuration,
      goodPostureDuration,
      alertCount: stats.alertTimes,
    };
  }, []);

  // 6. Calibrate Baseline — request a capture on the next analysed frame
  const calibrate = useCallback(() => {
    if (!poseRef.current) return false;
    shouldCalibrateRef.current = true;
    return true;
  }, []);

  // Clean up camera/pose if the component unmounts mid-session
  useEffect(() => {
    return () => {
      if (slouchTimerRef.current) clearTimeout(slouchTimerRef.current);
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (poseRef.current) {
        poseRef.current.close();
        poseRef.current = null;
      }
    };
  }, []);

  return {
    isLoaded,
    loadError,
    isAnalyzing,
    cameraError,
    calibrationData,
    metrics,
    isAlertActive,
    alertCount,
    videoRef,
    canvasRef,
    startMonitoring,
    stopMonitoring,
    calibrate,
    setCalibrationData,
  };
}
