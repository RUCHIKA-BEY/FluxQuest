import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useChat, type ChatMessage, type Lang, type Level } from './store';
import { ask, QUICK_CHIPS, rephraseForLevel } from './engine';
import { Markdown } from './MessageView';
import { Mascot } from './Mascot';
import { listen, speak, speechInputSupported, stopSpeaking, ttsSupported } from './speech';
import { track } from './analytics';
import type { ActionId } from './knowledge/passages';
import { navigate } from '../lib/router';
import { copyText } from '../lib/csv';
import { announce } from '../store/announcer';
import { useFocusTrap } from '../components/ui/Dialog';
import { Icon, type IconName } from '../components/ui/Icon';
import { Segmented } from '../components/ui/Controls';

const ACTIONS: Record<ActionId, { label: string; icon: IconName; go: () => void }> = {
  xray: { label: 'Open X-Ray Mode', icon: 'xray', go: () => navigate('lab', { xray: '1' }) },
  'var-material': { label: 'Test materials in the Variable Lab', icon: 'layers', go: () => navigate('variables', { var: 'material' }) },
  'var-wall': { label: 'Show me this in the Variable Lab', icon: 'layers', go: () => navigate('variables', { var: 'wallMm' }) },
  'var-diameter': { label: 'Show me this in the Variable Lab', icon: 'layers', go: () => navigate('variables', { var: 'innerDiameterMm' }) },
  'var-strength': { label: 'Test magnet strength', icon: 'layers', go: () => navigate('variables', { var: 'magnetStrength' }) },
  'var-height': { label: 'Test drop height', icon: 'layers', go: () => navigate('variables', { var: 'dropHeightM' }) },
  model: { label: 'Open the Real Model Guide', icon: 'book', go: () => navigate('model') },
  learn: { label: 'Learn the Physics', icon: 'book', go: () => navigate('learn') },
  lab: { label: 'Open in 3D Lab', icon: 'flask', go: () => navigate('lab') },
  results: { label: 'See my results', icon: 'chart', go: () => navigate('results') },
  predict: { label: 'Make a prediction', icon: 'target', go: () => navigate('predict') },
};

const EVIDENCE = {
  established: { label: 'Established physics', cls: 'text-success border-success/40' },
  assumption: { label: 'Project assumption', cls: 'text-eddy border-eddy/40' },
  estimate: { label: 'Estimate', cls: 'text-field border-field/40' },
} as const;

const MODE_LABEL: Record<NonNullable<ChatMessage['mode']>, string> = {
  online: 'AI answer grounded in verified sources',
  offline: 'Offline answer from reviewed notes',
  cached: 'Saved answer (offline-friendly)',
  safety: 'Safety guidance',
  'low-confidence': 'Low confidence',
};

const uid = () => Math.random().toString(36).slice(2, 10);

function useIsMobile() {
  const [m, setM] = useState(() => window.matchMedia('(max-width: 640px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

function AssistantMessage({ m, onClose, isMobile }: { m: ChatMessage; onClose: () => void; isMobile: boolean }) {
  const [srcOpen, setSrcOpen] = useState(false);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [report, setReport] = useState(false);
  const [reportText, setReportText] = useState('');
  const [copied, setCopied] = useState(false);
  const patch = useChat((s) => s.patch);
  const lang = useChat((s) => s.lang);
  return (
    <div className="max-w-[92%]">
      <div className="rounded-2xl rounded-tl-sm border border-espresso-700 bg-espresso-800 px-4 py-3 text-[0.95rem] text-oat-100">
        {m.text ? (
          <Markdown
            text={m.text}
            onCite={(n) => {
              setSrcOpen(true);
              setHighlight(n);
            }}
          />
        ) : (
          <TypingDots />
        )}
        {m.streaming && m.text && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-sage-300 align-middle" aria-hidden />}
        {!m.streaming && m.followUp && <p className="mt-2 border-t border-espresso-700 pt-2 text-sm text-sage-200">💡 {m.followUp}</p>}
      </div>
      {!m.streaming && (
        <div className="mt-1.5 space-y-2">
          {!!m.actions?.length && (
            <div className="flex flex-wrap gap-1.5">
              {m.actions.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    ACTIONS[a].go();
                    if (isMobile) onClose();
                  }}
                  className="fq-control inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-sage-400/60 bg-sage-400/10 px-3 text-xs font-semibold text-sage-200 hover:bg-sage-400/20"
                >
                  <Icon name={ACTIONS[a].icon} size={14} /> {ACTIONS[a].label}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1 text-xs text-oat-400">
            <span className="mr-1 inline-flex items-center gap-1">
              <Icon name="sparkle" size={12} /> {m.mode ? MODE_LABEL[m.mode] : ''}
              {m.level && ` · ${m.level}`}
            </span>
            <button
              type="button"
              className="rounded-md px-1.5 py-1 hover:text-oat-100"
              aria-label="Copy answer"
              onClick={async () => {
                setCopied(await copyText(m.text));
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              <Icon name="copy" size={14} /> <span className="sr-only">Copy</span>
              {copied && <span className="ml-1 text-success">Copied</span>}
            </button>
            {ttsSupported() && (
              <button type="button" className="rounded-md px-1.5 py-1 hover:text-oat-100" aria-label="Read answer aloud" onClick={() => speak(m.text, lang)}>
                <Icon name="volume" size={14} />
              </button>
            )}
            <button
              type="button"
              className={`rounded-md px-1.5 py-1 hover:text-oat-100 ${m.feedback === 'down' ? 'text-warn' : ''}`}
              aria-label="Report an incorrect or confusing answer"
              aria-expanded={report}
              onClick={() => setReport(!report)}
            >
              <Icon name="flag" size={14} />
            </button>
          </div>
          {report && (
            <form
              className="rounded-xl border border-espresso-700 p-3 text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                patch(m.id, { feedback: 'down' });
                track({ feedbackDown: 1 });
                try {
                  const all = JSON.parse(localStorage.getItem('fq-magneto-reports') ?? '[]');
                  all.push({ at: Date.now(), answer: m.text.slice(0, 400), note: reportText.slice(0, 400), sources: m.sources?.map((s) => s.passageId) });
                  localStorage.setItem('fq-magneto-reports', JSON.stringify(all.slice(-50)));
                } catch {
                  /* ignore */
                }
                setReport(false);
                announce('Thanks! Your report was saved on this device for your teacher to review.');
              }}
            >
              <label htmlFor={`rep-${m.id}`} className="font-semibold text-oat-100">
                What was wrong or confusing?
              </label>
              <textarea
                id={`rep-${m.id}`}
                rows={2}
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                className="mt-1 w-full rounded-lg border border-espresso-600 bg-espresso-900 p-2 text-oat-50"
                placeholder="Optional. Don’t include personal details."
              />
              <button type="submit" className="mt-2 min-h-[36px] rounded-lg bg-sage-400 px-3 text-xs font-semibold text-ink">
                Send report (saved locally)
              </button>
            </form>
          )}
          {!!m.sources?.length && (
            <div>
              <button type="button" aria-expanded={srcOpen} onClick={() => setSrcOpen(!srcOpen)} className="inline-flex min-h-[32px] items-center gap-1 text-xs font-semibold text-field underline underline-offset-2">
                <Icon name="book" size={13} /> Where did this come from? ({m.sources.length})
              </button>
              {srcOpen && (
                <ol className="mt-1 space-y-1.5">
                  {m.sources.map((s) => (
                    <li key={s.n} className={`rounded-lg border p-2 text-xs ${highlight === s.n ? 'border-field bg-field/10' : 'border-espresso-700'}`}>
                      <p className="font-semibold text-oat-100">
                        [{s.n}] {s.title}
                      </p>
                      <p className="text-oat-300">
                        {s.url ? (
                          <a href={s.url} target="_blank" rel="noreferrer noopener" className="underline underline-offset-2 hover:text-oat-50">
                            {s.sourceTitle}
                          </a>
                        ) : (
                          s.sourceTitle
                        )}{' '}
                        · {s.org}
                        {s.citation ? ` · ${s.citation}` : ''} · {s.section}
                      </p>
                      <span className={`mt-1 inline-block rounded-full border px-1.5 text-[10px] font-semibold ${EVIDENCE[s.evidence].cls}`}>{EVIDENCE[s.evidence].label}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1" role="status" aria-label="Magneto is searching the verified notes and writing an answer">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-sage-300" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
      <span className="ml-2 text-xs text-oat-400">Searching verified notes…</span>
    </span>
  );
}

export default function Magneto() {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const { messages, level, lang, voiceOut, set, add, patch, clear } = useChat();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    stopSpeaking();
    setTimeout(() => launcherRef.current?.focus(), 50);
  }, []);
  const trapRef = useFocusTrap(open && isMobile, close);

  useEffect(() => {
    if (!open || isMobile) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    setTimeout(() => inputRef.current?.focus(), 80);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, isMobile, close]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setInput('');
    add({ id: uid(), role: 'user', text: q.slice(0, 500), createdAt: Date.now() });
    const id = uid();
    add({ id, role: 'assistant', text: '', createdAt: Date.now(), streaming: true });
    setBusy(true);
    abort.current = new AbortController();
    let acc = '';
    try {
      const history = useChat.getState().messages.slice(0, -2);
      for await (const ev of ask(q, { level, lang, history, signal: abort.current.signal })) {
        if (ev.type === 'meta') patch(id, { sources: ev.sources, actions: ev.actions, confidence: ev.confidence, mode: ev.mode, level: ev.level, followUp: ev.followUp });
        else if (ev.type === 'delta') {
          acc += ev.text;
          patch(id, { text: acc });
        }
      }
    } catch {
      acc = acc || 'Sorry, something went wrong. Please try again.';
    } finally {
      // Drop citation markers that point to sources we don’t have (never show fabricated references).
      const n = useChat.getState().messages.find((m) => m.id === id)?.sources?.length ?? 0;
      acc = acc.replace(/\[S(\d+)\]/g, (s, d) => (Number(d) >= 1 && Number(d) <= n ? s : ''));
      patch(id, { streaming: false, text: acc });
      setBusy(false);
      announce(`Magneto answered: ${acc.replace(/[*#`[\]_]/g, '').slice(0, 220)}`);
      if (useChat.getState().voiceOut) speak(acc, lang);
    }
  };

  const lastUserQ = [...messages].reverse().find((m) => m.role === 'user')?.text;
  const onChip = (chip: string) => {
    if (chip === 'Explain like I’m 10.') {
      set({ level: 'simple' });
      return send(rephraseForLevel(chip, lastUserQ));
    }
    if (chip === 'Explain at college level.') {
      set({ level: 'expert' });
      return send(rephraseForLevel(chip, lastUserQ));
    }
    if (chip === 'Show me the equation.') return send(lastUserQ ? `Show me the equation for: ${lastUserQ}` : 'Explain the mathematical derivation of electromagnetic braking.');
    return send(chip);
  };

  const t = (en: string, hi: string) => (lang === 'hi' ? hi : en);

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            ref={launcherRef}
            type="button"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setOpen(true)}
            className="no-print fixed bottom-4 right-4 z-[60] flex min-h-[56px] items-center gap-2 rounded-full border border-sage-400/50 bg-espresso-800 p-2 sm:pr-5 font-semibold text-oat-50 shadow-[0_12px_40px_-12px_rgb(0_0_0/.9)] sm:bottom-6 sm:right-6"
            aria-label="Ask Magneto, your physics tutor"
          >
            <Mascot size={40} />
            <span className="hidden sm:inline">Ask Magneto</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal={isMobile}
            aria-labelledby="magneto-title"
            initial={isMobile ? { y: '100%' } : { x: 40, opacity: 0 }}
            animate={isMobile ? { y: 0 } : { x: 0, opacity: 1 }}
            exit={isMobile ? { y: '100%' } : { x: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="no-print fixed inset-0 z-[90] flex flex-col bg-espresso-900 sm:inset-y-4 sm:left-auto sm:right-4 sm:w-[430px] sm:rounded-[22px] sm:border sm:border-espresso-700 sm:shadow-[0_30px_80px_-20px_rgb(0_0_0/.9)]"
          >
            <header className="flex items-center gap-3 border-b border-espresso-700 px-4 py-3">
              <Mascot size={42} thinking={busy} />
              <div className="min-w-0 flex-1">
                <h2 id="magneto-title" className="font-display text-lg font-bold leading-tight text-oat-50">
                  Magneto
                </h2>
                <p className="truncate text-xs text-oat-400">{t('AI learning assistant · not a substitute for your teacher', 'AI सहायक · शिक्षक का विकल्प नहीं')}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  set({ voiceOut: !voiceOut });
                  if (voiceOut) stopSpeaking();
                }}
                aria-pressed={voiceOut}
                aria-label={voiceOut ? 'Turn off read-aloud' : 'Turn on read-aloud'}
                disabled={!ttsSupported()}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${voiceOut ? 'border-sage-400 text-sage-200' : 'border-espresso-600 text-oat-300'} disabled:opacity-40`}
              >
                <Icon name={voiceOut ? 'volume' : 'mute'} size={18} />
              </button>
              <button type="button" onClick={close} aria-label="Close Magneto" className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-espresso-600 text-oat-200 hover:text-oat-50">
                <Icon name="close" size={18} />
              </button>
            </header>

            <div className="grid grid-cols-[1fr_auto] items-end gap-2 border-b border-espresso-700 px-4 py-2">
              <Segmented<Level>
                label={t('Explanation level', 'स्तर')}
                hideLabel
                size="sm"
                value={level}
                onChange={(l) => set({ level: l })}
                options={[
                  { value: 'auto', label: 'Auto', ariaLabel: 'Automatic level' },
                  { value: 'simple', label: t('Simple', 'सरल') },
                  { value: 'detailed', label: t('Detailed', 'विस्तार') },
                  { value: 'expert', label: t('Expert', 'उन्नत') },
                ]}
              />
              <Segmented<Lang>
                label="Language"
                hideLabel
                size="sm"
                value={lang}
                onChange={(l) => set({ lang: l })}
                options={[
                  { value: 'en', label: 'EN', ariaLabel: 'English' },
                  { value: 'hi', label: <span lang="hi">हिं</span>, ariaLabel: 'Hindi' },
                ]}
              />
            </div>

            <div ref={logRef} role="log" aria-live="off" aria-label="Conversation with Magneto" className="fq-scroll flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <div className="max-w-[92%] rounded-2xl rounded-tl-sm border border-espresso-700 bg-espresso-800 px-4 py-3 text-oat-100">
                    <p>
                      {t(
                        'Hi! I’m Magneto 🧲. Ask me anything about magnets, eddy currents, Lenz’s law or your Lazy Tube experiment. I answer from verified notes and show you where each idea comes from.',
                        'नमस्ते! मैं मैग्नेटो हूँ 🧲। चुंबक, एडी करंट, लेंज़ के नियम या लेज़ी ट्यूब प्रयोग के बारे में कुछ भी पूछें।',
                      )}
                    </p>
                    <p className="mt-2 text-xs text-oat-400">{t('I know about your experiment settings and results, but never your name. No personal details needed.', 'मुझे आपका नाम नहीं चाहिए। कोई निजी जानकारी न दें।')}</p>
                  </div>
                </div>
              )}
              {messages.map((m) =>
                m.role === 'user' ? (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-sage-400 px-4 py-2.5 text-[0.95rem] text-ink" lang={/[ऀ-ॿ]/.test(m.text) ? 'hi' : undefined}>
                    {m.text}
                  </motion.div>
                ) : (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} lang={/[ऀ-ॿ]/.test(m.text) ? 'hi' : undefined}>
                    <AssistantMessage m={m} onClose={close} isMobile={isMobile} />
                  </motion.div>
                ),
              )}
            </div>

            <div className="border-t border-espresso-700 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
              <div className="fq-scroll -mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Suggested questions">
                {QUICK_CHIPS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={busy}
                    onClick={() => onChip(c)}
                    className="fq-control min-h-[36px] shrink-0 rounded-full border border-espresso-600 px-3 text-xs text-oat-200 hover:border-sage-400 hover:text-oat-50 disabled:opacity-50"
                  >
                    {c}
                  </button>
                ))}
              </div>
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
              >
                <label htmlFor="magneto-input" className="sr-only">
                  {t('Ask Magneto a question', 'मैग्नेटो से प्रश्न पूछें')}
                </label>
                <textarea
                  id="magneto-input"
                  ref={inputRef}
                  rows={1}
                  maxLength={500}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder={t('Ask about the invisible force…', 'अपना प्रश्न लिखें…')}
                  className="fq-control max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-espresso-600 bg-espresso-950 px-3 py-2.5 text-oat-50 placeholder:text-oat-400"
                />
                {speechInputSupported() && (
                  <button
                    type="button"
                    aria-label={listening ? 'Listening… tap to stop' : 'Ask by voice'}
                    aria-pressed={listening}
                    onClick={() => {
                      setMicError(null);
                      setListening(true);
                      listen(
                        lang,
                        (txt) => setInput((v) => (v ? v + ' ' : '') + txt),
                        (err) => {
                          setListening(false);
                          if (err) setMicError(err);
                        },
                      );
                    }}
                    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${listening ? 'animate-pulse border-warn text-warn' : 'border-espresso-600 text-oat-200'}`}
                  >
                    <Icon name="mic" size={18} />
                  </button>
                )}
                {busy ? (
                  <button type="button" onClick={() => abort.current?.abort()} aria-label="Stop answering" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-oat-200 text-ink">
                    <Icon name="pause" size={18} />
                  </button>
                ) : (
                  <button type="submit" aria-label="Send question" disabled={!input.trim()} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sage-400 text-ink disabled:opacity-40">
                    <Icon name="send" size={18} />
                  </button>
                )}
              </form>
              <div className="mt-2 flex items-center justify-between text-[11px] text-oat-400">
                <span>{micError ?? t('AI answers can be wrong. Check sources & ask your teacher.', 'AI उत्तर गलत हो सकते हैं। शिक्षक से पुष्टि करें।')}</span>
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Clear the chat history on this device?')) clear();
                    }}
                    className="inline-flex min-h-[32px] items-center gap-1 underline underline-offset-2 hover:text-oat-100"
                  >
                    <Icon name="trash" size={12} /> {t('Clear chat', 'चैट मिटाएँ')}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
