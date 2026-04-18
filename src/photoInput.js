let stream = null;
let capturedBase64 = null;
let onCapture = null;

export function init(onCaptureCb) {
  onCapture = onCaptureCb;
}

export async function start() {
  const overlay = document.getElementById('camera-overlay');
  const video = document.getElementById('camera-video');
  const preview = document.getElementById('camera-preview');
  const shutterBtn = document.getElementById('shutter-btn');
  const retakeBtn = document.getElementById('retake-btn');
  const photoConfirm = document.getElementById('photo-confirm');

  preview.style.display = 'none';
  video.style.display = 'block';
  shutterBtn.style.display = 'flex';
  retakeBtn.style.display = 'none';
  photoConfirm.style.display = 'none';
  capturedBase64 = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }
    });
    video.srcObject = stream;
    overlay.classList.add('active');
  } catch (e) {
    if (e.name === 'NotAllowedError') {
      alert('Camera permission denied. Please allow camera access in Settings.');
    } else {
      alert('Camera not available. Please type what you ate instead.');
    }
  }
}

export function capture() {
  const video = document.getElementById('camera-video');
  const canvas = document.getElementById('camera-canvas');
  const preview = document.getElementById('camera-preview');
  const shutterBtn = document.getElementById('shutter-btn');
  const retakeBtn = document.getElementById('retake-btn');
  const photoConfirm = document.getElementById('photo-confirm');

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  capturedBase64 = dataUrl.split(',')[1];

  preview.src = dataUrl;
  preview.style.display = 'block';
  video.style.display = 'none';
  shutterBtn.style.display = 'none';
  retakeBtn.style.display = 'block';
  photoConfirm.style.display = 'block';

  stopStream();
}

export function retake() {
  capturedBase64 = null;
  start();
}

export function confirm() {
  if (!capturedBase64) return;
  document.getElementById('camera-overlay').classList.remove('active');
  onCapture?.(capturedBase64, 'image/jpeg');
}

export function cancel() {
  stopStream();
  capturedBase64 = null;
  document.getElementById('camera-overlay').classList.remove('active');
}

function stopStream() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
}
