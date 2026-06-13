/* eslint-disable @typescript-eslint/no-explicit-any */
// MediaPipe landmark arrays are untyped at the library boundary.

export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface CalibrationData {
  noseToShoulderY: number;
  shoulderWidth: number;
  earToShoulderY: number;
  noseToEarDist: number;
}

export interface PostureMetrics {
  turtleNeckScore: number;     // 0 to 100 (100 is perfect, lower is bad)
  shoulderSymmetryScore: number; // 0 to 100 (100 is perfectly horizontal, lower is bad)
  slumpScore: number;            // 0 to 100 (100 is perfect, lower is bad)
  overallScore: number;          // Weighted average of all scores
  isSlouching: boolean;
}

/**
 * Calculates Euclidean distance between two 2D points.
 */
export function distance(p1: Landmark, p2: Landmark): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/**
 * Evaluates the current posture against the calibrated baseline values.
 * Returns scores between 0 and 100 where higher is better.
 */
export function evaluatePosture(
  landmarks: any[], // MediaPipe landmarks (array of 33 points)
  baseline: CalibrationData,
  sensitivity: number = 5 // 1 (very lenient) to 10 (very strict)
): PostureMetrics {
  // MediaPipe Pose landmarks indices:
  // 0: Nose
  // 7: Left Ear, 8: Right Ear
  // 11: Left Shoulder, 12: Right Shoulder
  
  const nose = landmarks[0] as Landmark;
  const leftEar = landmarks[7] as Landmark;
  const rightEar = landmarks[8] as Landmark;
  const leftShoulder = landmarks[11] as Landmark;
  const rightShoulder = landmarks[12] as Landmark;

  if (!nose || !leftEar || !rightEar || !leftShoulder || !rightShoulder) {
    return {
      turtleNeckScore: 100,
      shoulderSymmetryScore: 100,
      slumpScore: 100,
      overallScore: 100,
      isSlouching: false
    };
  }

  // 1. Calculate shoulder symmetry (slope)
  const shoulderDy = Math.abs(leftShoulder.y - rightShoulder.y);
  const shoulderDx = distance(leftShoulder, rightShoulder);
  const shoulderSlope = shoulderDy / (shoulderDx || 1);
  
  // Normal shoulder slope is near 0. A slope of 0.15 is highly tilted.
  // We map 0.0 -> 100, 0.15 -> 0.
  const tiltFactor = 0.15 * (11 - sensitivity) / 5; // Adjust threshold based on sensitivity
  let shoulderSymmetryScore = Math.max(0, 100 - (shoulderSlope / tiltFactor) * 100);
  shoulderSymmetryScore = Math.round(shoulderSymmetryScore);

  // 2. Calculate Slump Score (head relative to shoulder vertical height)
  const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const noseToShoulderY = avgShoulderY - nose.y; // distance nose is above shoulders
  
  // If noseToShoulderY drops, the head has dropped (slouching)
  // We compare it to the baseline.
  const slumpRatio = noseToShoulderY / (baseline.noseToShoulderY || 1);
  
  // If slumpRatio is 1.0 or more, they are upright. If it drops to 0.70, they are slouched.
  // Sensitivity: scale the threshold. High sensitivity means even small drops trigger.
  const minSlumpAllowed = 0.85 - (10 - sensitivity) * 0.02; // e.g., sensitivity 5 -> 0.75 allowed
  let slumpScore = 100;
  if (slumpRatio < 1.0) {
    const range = 1.0 - minSlumpAllowed;
    const diff = 1.0 - slumpRatio;
    slumpScore = Math.max(0, 100 - (diff / (range || 0.1)) * 100);
  }
  slumpScore = Math.round(slumpScore);

  // 3. Calculate Turtle Neck Score (head forward shift)
  // When head moves forward, the distance between ears and nose changes horizontally,
  // and the ear-to-shoulder vertical distance decreases.
  const avgEarY = (leftEar.y + rightEar.y) / 2;
  const earToShoulderY = avgShoulderY - avgEarY;
  
  const turtleNeckRatio = earToShoulderY / (baseline.earToShoulderY || 1);
  const minTurtleAllowed = 0.85 - (10 - sensitivity) * 0.02;
  let turtleNeckScore = 100;
  if (turtleNeckRatio < 1.0) {
    const range = 1.0 - minTurtleAllowed;
    const diff = 1.0 - turtleNeckRatio;
    turtleNeckScore = Math.max(0, 100 - (diff / (range || 0.1)) * 100);
  }
  turtleNeckScore = Math.round(turtleNeckScore);

  // 4. Overall Score & Slouching threshold
  const overallScore = Math.round((turtleNeckScore + shoulderSymmetryScore + slumpScore) / 3);
  
  // Trigger isSlouching if any of the scores drop below a threshold (e.g. 70)
  // higher sensitivity = higher threshold to trigger alert
  const alertThreshold = 65 + (sensitivity * 1.5); // sensitivity 5 -> 72.5 threshold
  const isSlouching = turtleNeckScore < alertThreshold || slumpScore < alertThreshold || shoulderSymmetryScore < alertThreshold;

  return {
    turtleNeckScore,
    shoulderSymmetryScore,
    slumpScore,
    overallScore,
    isSlouching
  };
}

/**
 * Creates a CalibrationData object from current active landmarks.
 */
export function getCalibrationValues(landmarks: any[]): CalibrationData | null {
  const nose = landmarks[0] as Landmark;
  const leftEar = landmarks[7] as Landmark;
  const rightEar = landmarks[8] as Landmark;
  const leftShoulder = landmarks[11] as Landmark;
  const rightShoulder = landmarks[12] as Landmark;

  if (!nose || !leftEar || !rightEar || !leftShoulder || !rightShoulder) {
    return null;
  }

  const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const avgEarY = (leftEar.y + rightEar.y) / 2;
  
  return {
    noseToShoulderY: Math.max(0.01, avgShoulderY - nose.y),
    shoulderWidth: Math.max(0.01, distance(leftShoulder, rightShoulder)),
    earToShoulderY: Math.max(0.01, avgShoulderY - avgEarY),
    noseToEarDist: Math.max(0.01, (distance(nose, leftEar) + distance(nose, rightEar)) / 2)
  };
}
