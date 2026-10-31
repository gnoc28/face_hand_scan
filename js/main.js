import {
  FilesetResolver,
  FaceLandmarker,
  HandLandmarker,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const handCountEl = document.getElementById("handCount");
const fpsEl = document.getElementById("fps");
const errorEl = document.getElementById("error");
const guideEl = document.getElementById("guide");
const btnStart = document.getElementById("btnStart");
const btnStop = document.getElementById("btnStop");
const btnSwitch = document.getElementById("btnSwitch");
const btnShot = document.getElementById("btnShot");
const btnFullscreen = document.getElementById("btnFullscreen");
const chkHands = document.getElementById("chkHands");
const chkFace = document.getElementById("chkFace");
const chkMirror = document.getElementById("chkMirror");
const sensitivity = document.getElementById("sensitivity");
const sensitivityValue = document.getElementById("sensitivityValue");
const gestureImageEl = document.getElementById("gestureImage");

let handLandmarker = null;
let faceLandmarker = null;
let stream = null;
let running = false;
let rafId = 0;
let lastVideoTime = -1;
let facingMode = "user";
let frames = 0;
let fpsTimer = 0;
let currentGesture = "";

const gestureProfiles = {
  openPalm: {
    name: "Bàn tay mở",
    hint: "Đã nhận diện 5 ngón tay đang mở.",
    image: "cat_meme/tay_tren_dau.jpg",
  },
  pointing: {
    name: "Chỉ ngón trỏ",
    hint: "Bạn đang giơ ngón trỏ.",
    image: "cat_meme/ngon_tro.jpg",
  },
  shush: {
    name: "Suỵt",
    hint: "Đưa ngón trỏ lên gần miệng để ra hiệu im lặng.",
    image: "cat_meme/suyt.jpg",
  },
  fist: {
    name: "Nắm tay",
    hint: "Các ngón tay đang khép lại.",
    image: "cat_meme/nghiem_tuc.jpg",
  },
  pout: {
    name: "Chu môi",
    hint: "Đã nhận diện biểu cảm chu môi.",
    image: "cat_meme/tay_qua_dau.jpg",
  },
  neutral: {
    name: "Biểu cảm bình thường",
    hint: "Khuôn mặt đang ở trạng thái bình thường.",
    image: "cat_meme/nghiem_tuc.jpg",
  },
  callMe: {
    name: "Gọi điện",
    hint: "Đã nhận diện ngón cái và ngón út cùng mở.",
    image: "cat_meme/cai_va_tro.jpg",
  },
  none: {
    name: "Chưa nhận diện cử chỉ",
    hint: "Chưa có kết quả nhận diện.",
    image: "cat_meme/nghiem_tuc.jpg",
  },
};

function setStatus(text) {
  statusEl.textContent = text;
}

function updateProfile(profileKey) {
  if (profileKey === currentGesture) return;
  currentGesture = profileKey;
  const profile = gestureProfiles[profileKey];
  setGestureImage(profile);
}

function showError(message) {
  errorEl.hidden = false;
  errorEl.textContent = message;
}

function clearError() {
  errorEl.hidden = true;
  errorEl.textContent = "";
}

function setGestureImage(profile) {
  const imageUrl = new URL(profile.image, document.baseURI).href;
  gestureImageEl.src = imageUrl;
  gestureImageEl.alt = `Ảnh minh họa cử chỉ ${profile.name.toLowerCase()}`;
}

async function loadModel() {
  if (handLandmarker && faceLandmarker) return;
  setStatus("Đang tải bộ nhận diện mặt và bàn tay...");
  const fileset = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );
  [faceLandmarker, handLandmarker] = await Promise.all([
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU",
      },
      outputFaceBlendshapes: true,
      runningMode: "VIDEO",
      numFaces: 1,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    }),
    HandLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: parseFloat(sensitivity.value),
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    }),
  ]);
}

function resizeCanvas() {
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

function distanceBetween(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function isFingerExtended(points, tip, pip) {
  const wristDistance = distanceBetween(points[tip], points[0]);
  const jointDistance = distanceBetween(points[pip], points[0]);
  return wristDistance > jointDistance * 1.12;
}

function getGesture(points, facePoints) {
  const indexUp = isFingerExtended(points, 8, 6);
  const middleUp = isFingerExtended(points, 12, 10);
  const ringUp = isFingerExtended(points, 16, 14);
  const pinkyUp = isFingerExtended(points, 20, 18);
  const palmLength = distanceBetween(points[0], points[9]);
  const thumbToPalm = distanceBetween(points[4], points[9]);
  const thumbToIndexBase = distanceBetween(points[4], points[5]);
  const thumbExtended =
    thumbToPalm > palmLength * 0.9 &&
    thumbToIndexBase > palmLength * 0.75;
  const extendedCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;

  if (thumbExtended && pinkyUp && !indexUp && !middleUp && !ringUp) return "callMe";
  if (indexUp && !middleUp && !ringUp && !pinkyUp) {
    if (facePoints) {
      const mouthPoints = [facePoints[13], facePoints[14], facePoints[78], facePoints[308]];
      const mouth = {
        x: mouthPoints.reduce((sum, point) => sum + point.x, 0) / mouthPoints.length,
        y: mouthPoints.reduce((sum, point) => sum + point.y, 0) / mouthPoints.length,
      };
      if (distanceBetween(points[8], mouth) < palmLength * 1.35) return "shush";
    }
    return "pointing";
  }
  if (extendedCount === 4) return "openPalm";
  if (extendedCount === 0 && !thumbExtended) return "fist";
  return "none";
}

function isPouting(faceBlendshapes) {
  const categories = faceBlendshapes?.[0]?.categories || [];
  const scores = new Map(categories.map((category) => [category.categoryName, category.score]));
  const pucker = scores.get("mouthPucker") || 0;
  const funnel = scores.get("mouthFunnel") || 0;
  return Math.max(pucker, funnel) >= 0.45;
}

function updateGesture(handLandmarks, facePoints) {
  const nextGesture = getGesture(handLandmarks[0], facePoints);
  updateProfile(nextGesture);
}

function resetGesture() {
  currentGesture = "";
  const profile = gestureProfiles.none;
  setGestureImage(profile);
}

function drawHands(handLandmarks) {
  if (!chkHands.checked) return;
  const drawingUtils = new DrawingUtils(ctx);
  handLandmarks.forEach((landmarks) => {
    const mirrored = landmarks.map((point) => ({
      x: chkMirror.checked ? 1 - point.x : point.x,
      y: point.y,
      z: point.z,
    }));
    drawingUtils.drawConnectors(mirrored, HandLandmarker.HAND_CONNECTIONS, {
      color: "#f97316",
      lineWidth: 2,
    });
    drawingUtils.drawLandmarks(mirrored, {
      color: "#fed7aa",
      lineWidth: 1,
      radius: 2,
    });
  });
}

function loop() {
  if (!running) return;
  rafId = requestAnimationFrame(loop);
  if (!video.videoWidth) return;
  resizeCanvas();
  if (video.currentTime === lastVideoTime) return;
  lastVideoTime = video.currentTime;

  let results;
  let faceResults;
  try {
    results = handLandmarker.detectForVideo(video, performance.now());
    faceResults = chkFace.checked
      ? faceLandmarker.detectForVideo(video, performance.now())
      : { faceLandmarks: [] };
  } catch (err) {
    showError("Lỗi nhận diện mặt hoặc bàn tay: " + err.message);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const hands = results.landmarks || [];
  const facePoints = chkFace.checked
    ? faceResults.faceLandmarks?.[0] || null
    : null;
  handCountEl.textContent = String(hands.length);
  guideEl.hidden = true;

  if (hands.length === 0 && facePoints) {
    if (isPouting(faceResults.faceBlendshapes)) {
      updateProfile("pout");
      setStatus("Đã nhận diện biểu cảm chu môi.");
    } else {
      updateProfile("neutral");
      setStatus("Đã nhận diện khuôn mặt bình thường.");
    }
  } else if (hands.length === 0) {
    resetGesture();
    setStatus(
      chkFace.checked
        ? "Đang chạy, chưa thấy mặt hoặc bàn tay."
        : "Đã tắt nhận diện khuôn mặt, chưa thấy bàn tay."
    );
  } else {
    setStatus(`Đang nhận diện ${hands.length} bàn tay.`);
    drawHands(hands);
    updateGesture(hands, facePoints);
  }

  frames += 1;
  const now = performance.now();
  if (now - fpsTimer >= 1000) {
    fpsEl.textContent = String(frames);
    frames = 0;
    fpsTimer = now;
  }
}

async function startCamera() {
  clearError();
  btnStart.disabled = true;
  try {
    await loadModel();
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  } catch (err) {
    btnStart.disabled = false;
    if (err.name === "NotAllowedError") {
      showError("Bạn đã từ chối quyền camera. Hãy cho phép camera rồi thử lại.");
    } else if (err.name === "NotFoundError") {
      showError("Không tìm thấy webcam trên máy này.");
    } else if (err.name === "NotReadableError") {
      showError("Camera đang được ứng dụng khác sử dụng.");
    } else {
      showError("Không bật được camera: " + err.message);
    }
    return;
  }

  video.srcObject = stream;
  video.classList.toggle("mirrored", chkMirror.checked);
  await video.play();
  resizeCanvas();
  running = true;
  fpsTimer = performance.now();
  frames = 0;
  btnStop.disabled = false;
  btnSwitch.disabled = false;
  btnShot.disabled = false;
  setStatus("Đang chạy, đưa bàn tay vào camera.");
  loop();
}

function stopCamera() {
  running = false;
  cancelAnimationFrame(rafId);
  if (stream) stream.getTracks().forEach((track) => track.stop());
  stream = null;
  video.srcObject = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  handCountEl.textContent = "0";
  fpsEl.textContent = "0";
  guideEl.hidden = false;
  resetGesture();
  btnStart.disabled = false;
  btnStop.disabled = true;
  btnSwitch.disabled = true;
  btnShot.disabled = true;
  setStatus("Đã dừng camera.");
}

btnStart.addEventListener("click", startCamera);
btnStop.addEventListener("click", stopCamera);
btnSwitch.addEventListener("click", async () => {
  facingMode = facingMode === "user" ? "environment" : "user";
  const wasRunning = running;
  stopCamera();
  if (wasRunning) await startCamera();
});
btnShot.addEventListener("click", () => {
  const shot = document.createElement("canvas");
  shot.width = canvas.width;
  shot.height = canvas.height;
  const shotContext = shot.getContext("2d");
  if (chkMirror.checked) {
    shotContext.translate(shot.width, 0);
    shotContext.scale(-1, 1);
  }
  shotContext.drawImage(video, 0, 0, shot.width, shot.height);
  shotContext.setTransform(1, 0, 0, 1, 0, 0);
  shotContext.drawImage(canvas, 0, 0);
  const link = document.createElement("a");
  link.download = "cu-chi-tay.png";
  link.href = shot.toDataURL("image/png");
  link.click();
});
chkMirror.addEventListener("change", () => {
  video.classList.toggle("mirrored", chkMirror.checked);
});
chkFace.addEventListener("change", () => {
  if (!chkFace.checked && handsAreEmpty()) {
    resetGesture();
    setStatus("Đã tắt nhận diện khuôn mặt.");
  }
});
chkHands.addEventListener("change", () => {
  if (!chkHands.checked) ctx.clearRect(0, 0, canvas.width, canvas.height);
});
btnFullscreen.addEventListener("click", async () => {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else {
    await document.getElementById("stage").requestFullscreen();
  }
});
sensitivity.addEventListener("input", () => {
  sensitivityValue.textContent = parseFloat(sensitivity.value).toFixed(2);
  if (handLandmarker) {
    handLandmarker.setOptions({
      minHandDetectionConfidence: parseFloat(sensitivity.value),
    });
  }
});

gestureImageEl.addEventListener("error", () => {
  showError(`Không tải được ảnh minh họa: ${gestureImageEl.src}`);
});

function handsAreEmpty() {
  return handCountEl.textContent === "0";
}
