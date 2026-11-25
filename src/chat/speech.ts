/** Voice input (Web Speech API) and read-aloud (speechSynthesis). Both optional, feature-detected. */
type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export function speechInputSupported() {
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function listen(lang: 'en' | 'hi', onText: (t: string) => void, onEnd: (err?: string) => void) {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) {
    onEnd('Voice input is not supported in this browser.');
    return () => {};
  }
  const r = new Ctor();
  r.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
  r.interimResults = false;
  r.maxAlternatives = 1;
  r.onresult = (e) => onText(e.results[0][0].transcript);
  r.onerror = (e) => onEnd(e.error === 'not-allowed' ? 'Microphone permission was denied.' : 'Sorry, I didn’t catch that.');
  r.onend = () => onEnd();
  r.start();
  return () => r.stop();
}

export const ttsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Strip markdown and citation markers so speech sounds natural. */
export function toSpeech(md: string) {
  return md
    .replace(/\[S?\d+\]/g, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/[*#_>|]/g, '')
    .replace(/^- /gm, '')
    .replace(/\n+/g, '. ');
}

export function speak(md: string, lang: 'en' | 'hi') {
  if (!ttsSupported()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(toSpeech(md));
  u.lang = lang === 'hi' || /[ऀ-ॿ]/.test(md) ? 'hi-IN' : 'en-IN';
  u.rate = 0.95;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(u.lang.slice(0, 2)));
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}
