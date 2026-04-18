let recognition = null;
let onResult = null;
let onError = null;

export function isSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function init(onResultCb, onErrorCb) {
  onResult = onResultCb;
  onError = onErrorCb;
}

export function start() {
  if (!isSupported()) {
    onError?.('Voice input is not available in this browser. Please type instead.');
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;

  let finalTranscript = '';

  recognition.onstart = () => {
    document.getElementById('transcript-text').textContent = 'Listening… say what you ate';
    document.getElementById('listening-overlay').classList.add('active');
  };

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalTranscript += t;
      else interim = t;
    }
    const el = document.getElementById('transcript-text');
    if (el) el.textContent = (finalTranscript + interim) || 'Listening…';
  };

  recognition.onend = () => {
    document.getElementById('listening-overlay').classList.remove('active');
    if (finalTranscript.trim()) {
      onResult?.(finalTranscript.trim());
    }
    history.replaceState({}, '', '/');
  };

  recognition.onerror = (event) => {
    document.getElementById('listening-overlay').classList.remove('active');
    if (event.error === 'no-speech') return;
    if (event.error === 'not-allowed') {
      onError?.('Microphone permission denied. Please allow microphone access in Settings.');
    } else if (event.error === 'network') {
      onError?.('Voice unavailable — please type instead.');
    } else {
      onError?.('Voice error: ' + event.error);
    }
  };

  try {
    recognition.start();
  } catch (e) {
    onError?.('Could not start voice input: ' + e.message);
  }
}

export function stop() {
  recognition?.stop();
  document.getElementById('listening-overlay')?.classList.remove('active');
}
