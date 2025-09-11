// components/VirtualInterviewer.jsx
import { useEffect, useMemo, useRef, useState } from 'react';

export default function VirtualInterviewer({ userId: initialUserId = '' }) {
  const [userId, setUserId] = useState(initialUserId || '');
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('medium'); // easy|medium|hard
  const [style, setStyle] = useState('technical'); // technical|behavioral
  const [maxQuestions, setMaxQuestions] = useState(8);

  const [transcript, setTranscript] = useState([]); // {role: 'interviewer'|'candidate', content}
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [runningScore, setRunningScore] = useState({ sum: 0, count: 0 });
  const endRef = useRef(null);
  const chatRef = useRef(null);

  // Voice features
  const supportsTTS = typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';
  const supportsASR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const RecognitionCtor = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const LANG_OPTIONS = [
    'en-US','en-GB','hi-IN','es-ES','fr-FR','de-DE','it-IT','ja-JP','ko-KR','zh-CN','pt-BR','ar-SA','ru-RU'
  ];
  const defaultLang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'en-US';
  const [selectedLang, setSelectedLang] = useState(defaultLang);
  const [voices, setVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [speakFeedback, setSpeakFeedback] = useState(false);
  const [listening, setListening] = useState(false);
  // Do not auto-open mic by default. Users can opt-in.
  const [autoListen, setAutoListen] = useState(false);
  const [autoAdvanceOnSilence, setAutoAdvanceOnSilence] = useState(true);
  const [silenceMs, setSilenceMs] = useState(6000);
  const [sessionStopped, setSessionStopped] = useState(false);
  const [prepTimeSec, setPrepTimeSec] = useState(3);
  const [prepCountdownSec, setPrepCountdownSec] = useState(0);
  const [lastEvaluation, setLastEvaluation] = useState(null);
  const recognitionRef = useRef(null);
  const lastQuestionRef = useRef('');
  const listenTimerRef = useRef(null);
  const recognizedRef = useRef(false);
  const prepTimerRef = useRef(null);
  const answerBufferRef = useRef('');
  const submitScheduledRef = useRef(false);

  // (Keyboard shortcuts effect defined after canStart)

  // Load TTS voices
  useEffect(() => {
    if (!supportsTTS) return;
    const synth = window.speechSynthesis;
    const load = () => {
      const list = synth.getVoices();
      setVoices(list || []);
      // auto-pick voice matching language if none picked
      if (!selectedVoiceURI && list && list.length) {
        const match = list.find(v => v.lang && v.lang.toLowerCase().startsWith(selectedLang.toLowerCase()));
        setSelectedVoiceURI((match || list[0]).voiceURI);
      }
    };
    load();
    synth.onvoiceschanged = load;
    return () => { try { synth.onvoiceschanged = null; } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportsTTS]);

  // If language changes, try switch to a matching voice
  useEffect(() => {
    if (!voices.length) return;
    const match = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(selectedLang.toLowerCase()));
    if (match) setSelectedVoiceURI(match.voiceURI);
  }, [selectedLang, voices]);

  const speakNow = (text, opts = {}) => {
    try {
      if (!supportsTTS || !ttsEnabled || !text) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.02;
      u.pitch = 1.0;
      u.lang = selectedLang || 'en-US';
      const v = voices.find(x => x.voiceURI === selectedVoiceURI);
      if (v) u.voice = v;
      if (opts.onend) u.onend = opts.onend;
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const clearPrepCountdown = () => {
    try { if (prepTimerRef.current) clearInterval(prepTimerRef.current); } catch {}
    setPrepCountdownSec(0);
  };

  const startPrepCountdown = () => {
    if (!autoListen || sessionStopped) return;
    clearPrepCountdown();
    const total = Math.max(0, Number(prepTimeSec) || 0);
    if (total <= 0) { startListeningFullAnswer(); return; }
    setPrepCountdownSec(total);
    prepTimerRef.current = setInterval(() => {
      setPrepCountdownSec((s) => {
        if (s <= 1) {
          try { if (prepTimerRef.current) clearInterval(prepTimerRef.current); } catch {}
          startListeningFullAnswer();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const canStart = useMemo(() => {
    // Allow starting without a topic; API falls back to '(general)'.
    return !busy && ['easy','medium','hard'].includes(level) && ['technical','behavioral'].includes(style);
  }, [busy, level, style]);

  const sessionKey = useMemo(() => {
    const uid = userId?.trim() || 'guest';
    const t = topic?.trim() || 'general';
    return `ai_interview_session:${uid}:${t}`;
  }, [userId, topic]);
  // Keyboard shortcuts: s=start, m=mic, r=repeat (avoid when typing)
  useEffect(() => {
    const onKeyDown = (e) => {
      try {
        const tag = String(e?.target?.tagName || '').toLowerCase();
        const isTyping = tag === 'input' || tag === 'textarea' || (e?.target?.isContentEditable);
        if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return;
        const key = String(e.key || '').toLowerCase();
        if (key === 's') {
          if (!busy && canStart && transcript.length === 0) {
            e.preventDefault();
            handleStart();
          }
        } else if (key === 'm') {
          if (!busy && !sessionStopped && supportsASR && transcript.length > 0) {
            e.preventDefault();
            if (listening) stopListening(); else startListeningFullAnswer();
          }
        } else if (key === 'r') {
          if (!busy && ttsEnabled && lastQuestionRef.current) {
            e.preventDefault();
            speakNow(lastQuestionRef.current);
          }
        }
      } catch {}
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, canStart, transcript.length, sessionStopped, supportsASR, listening, ttsEnabled]);

  // hydrate existing session
  useEffect(() => {
    try {
      const s = localStorage.getItem(sessionKey);
      if (s) {
        const obj = JSON.parse(s);
        if (Array.isArray(obj?.transcript)) setTranscript(obj.transcript);
        if (obj?.runningScore && Number.isFinite(obj.runningScore.sum)) setRunningScore(obj.runningScore);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

  useEffect(() => {
    try {
      localStorage.setItem(sessionKey, JSON.stringify({ transcript, runningScore, ts: Date.now(), level, style, maxQuestions }));
    } catch {}
  }, [sessionKey, transcript, runningScore, level, style, maxQuestions]);

  useEffect(() => {
    try {
      const el = chatRef.current;
      if (!el) return;
      // Only scroll the chat container, not the whole page
      // Skip when no messages to avoid unnecessary jumps on mount
      if (!transcript || transcript.length === 0) return;
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } catch {}
  }, [transcript, busy]);

  const resetSession = () => {
    setTranscript([]);
    setRunningScore({ sum: 0, count: 0 });
    setInput('');
    setError('');
  };

  const startOrNext = async (candidateAnswer) => {
    if (busy) return;
    if (sessionStopped) return;
    if (!canStart) return;
    setBusy(true);
    setError('');
    try {
      const body = {
        topic: topic.trim(),
        level, style,
        transcript,
        maxQuestions: Math.max(1, Math.min(20, Number(maxQuestions) || 8)),
      };
      // If user just answered, append to transcript before sending
      let baseTranscript = transcript;
      if (candidateAnswer && candidateAnswer.trim()) {
        baseTranscript = [...transcript, { role: 'candidate', content: candidateAnswer.trim() }];
        body.transcript = baseTranscript;
      }

      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let msg = 'Failed to progress interview.';
        try { const j = await res.json(); msg = j?.error || j?.detail || msg; } catch {}
        throw new Error(msg);
      }
      const data = await res.json();

      // Update running score from evaluation
      if (data?.evaluation && data.evaluation.lastAnswerScore != null) {
        const s = Number(data.evaluation.lastAnswerScore);
        if (Number.isFinite(s)) setRunningScore((r) => ({ sum: r.sum + s, count: r.count + 1 }));
      }
      if (data?.evaluation) setLastEvaluation(data.evaluation);

      const nextTurns = [];
      if (candidateAnswer && candidateAnswer.trim()) {
        nextTurns.push({ role: 'candidate', content: candidateAnswer.trim() });
      }
      if (data?.evaluation) {
        // Render a compact interviewer evaluation message
        const fbParts = [];
        if (data.evaluation.feedback) fbParts.push(`Feedback: ${data.evaluation.feedback}`);
        if (Array.isArray(data.evaluation.strengths) && data.evaluation.strengths.length) fbParts.push(`Strengths: ${data.evaluation.strengths.join('; ')}`);
        if (Array.isArray(data.evaluation.weaknesses) && data.evaluation.weaknesses.length) fbParts.push(`Weaknesses: ${data.evaluation.weaknesses.join('; ')}`);
        if (data.evaluation.corrections) fbParts.push(`Corrections: ${data.evaluation.corrections}`);
        if (fbParts.length) nextTurns.push({ role: 'interviewer', content: fbParts.join('\n') });
        if (ttsEnabled && speakFeedback) speakNow(fbParts.join(' '));
      }
      if (data?.done) {
        const summaryText = data?.summary
          ? `Summary: ${(data.summary.overallScore != null ? `Overall ${(Math.round(Number(data.summary.overallScore) * 100))}%\n` : '')}${data.summary.notes || ''}${data.summary.recommendation ? `\nRecommendation: ${data.summary.recommendation}` : ''}`
          : 'We are done. Great job!';
        nextTurns.push({ role: 'interviewer', content: summaryText });
        if (ttsEnabled) speakNow(summaryText);
        setSessionStopped(true);
      } else if (data?.next?.question) {
        nextTurns.push({ role: 'interviewer', content: data.next.question });
        lastQuestionRef.current = data.next.question;
        if (ttsEnabled) speakNow(data.next.question, { onend: () => { if (autoListen) startPrepCountdown(); } });
        else if (autoListen) startPrepCountdown();
      }

      setTranscript((prev) => [...prev, ...nextTurns]);
    } catch (e) {
      setError(e?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const handleStart = async () => {
    resetSession();
    await startOrNext('');
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const answer = input;
    setInput('');
    await startOrNext(answer);
  };

  // End-of-answer phrase handling
  const END_PHRASES = useMemo(() => [
    "that's all", "thats all", "that's it", "thats it", "that is all",
    "done", "i'm done", "im done", "finished", "the end", "end of answer",
    "that is it", "ok that's all", "okay that's all", "that's everything"
  ], []);
  const containsEndPhrase = (text) => {
    const t = String(text || '').toLowerCase();
    return END_PHRASES.some((p) => t.includes(p));
  };
  const stripEndPhrases = (text) => {
    let t = String(text || '');
    END_PHRASES.forEach((p) => {
      const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      t = t.replace(re, '');
    });
    return t.trim();
  };

  // Listen to a full answer, stop on end phrase or long silence
  const startListeningFullAnswer = () => {
    if (!supportsASR || listening || busy || transcript.length === 0) return;
    try {
      const rec = new RecognitionCtor();
      recognitionRef.current = rec;
      rec.lang = selectedLang || 'en-US';
      rec.continuous = true;
      rec.interimResults = true;
      setListening(true);
      recognizedRef.current = false;
      submitScheduledRef.current = false;
      answerBufferRef.current = '';

      const scheduleSilenceStop = () => {
        if (listenTimerRef.current) try { clearTimeout(listenTimerRef.current); } catch {}
        listenTimerRef.current = setTimeout(() => { try { rec.stop(); } catch {} }, Math.max(2000, Number(silenceMs) || 6000));
      };
      scheduleSilenceStop();

      rec.onresult = (event) => {
        try {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i];
            const txt = (res[0]?.transcript || '').trim();
            if (!txt) continue;
            if (res.isFinal) {
              answerBufferRef.current = (answerBufferRef.current + ' ' + txt).trim();
              recognizedRef.current = true;
            } else {
              interim = (interim + ' ' + txt).trim();
            }
          }
          const live = [answerBufferRef.current, interim].filter(Boolean).join(' ').trim();
          setInput(live);
          scheduleSilenceStop();
          if (containsEndPhrase(live) && !submitScheduledRef.current) {
            submitScheduledRef.current = true;
            try { rec.stop(); } catch {}
          }
        } catch {}
      };
      rec.onerror = () => {
        try { if (listenTimerRef.current) clearTimeout(listenTimerRef.current); } catch {}
        setListening(false);
      };
      rec.onend = async () => {
        setListening(false);
        try { if (listenTimerRef.current) clearTimeout(listenTimerRef.current); } catch {}
        clearPrepCountdown();
        // Only submit recognized speech, never fall back to text input.
        const raw = answerBufferRef.current;
        const finalText = stripEndPhrases(raw || '').trim();
        // Clear any leftover input so it isn't reused accidentally.
        setInput('');
        if (finalText) {
          await startOrNext(finalText);
          return;
        }
        if (!recognizedRef.current && autoAdvanceOnSilence) {
          setTranscript((prev) => [...prev, { role: 'interviewer', content: 'No answer detected. Moving on.' }]);
          startOrNext('');
        }
      };
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const stopListening = () => {
    try { if (recognitionRef.current) recognitionRef.current.stop(); } catch {}
  };

  // End-of-answer phrase handling
  const END_PHRASES_OLD = useMemo(() => [
    "that's all", "thats all", "that's it", "thats it", "that is all",
    "done", "i'm done", "im done", "finished", "the end", "end of answer",
    "that is it", "ok that's all", "okay that's all", "that's everything"
  ], []);
  const containsEndPhraseOld = (text) => {
    const t = String(text || '').toLowerCase();
    return END_PHRASES_OLD.some((p) => t.includes(p));
  };
  const stripEndPhrasesOld = (text) => {
    let t = String(text || '');
    END_PHRASES_OLD.forEach((p) => {
      const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      t = t.replace(re, '');
    });
    return t.trim();
  };

  const startListening = () => {
    if (!supportsASR || listening || busy || transcript.length === 0) return;
    try {
      const rec = new RecognitionCtor();
      recognitionRef.current = rec;
      rec.lang = selectedLang || 'en-US';
      rec.continuous = false;
      rec.interimResults = false;
      setListening(true);
      recognizedRef.current = false;
      if (listenTimerRef.current) try { clearTimeout(listenTimerRef.current); } catch {}
      listenTimerRef.current = setTimeout(() => {
        try { rec.stop(); } catch {}
      }, Math.max(2000, Number(silenceMs) || 6000));

      rec.onresult = async (event) => {
        const result = event.results && event.results[0] && event.results[0][0];
        const text = String(result?.transcript || '').trim();
        recognizedRef.current = Boolean(text);
        setListening(false);
        try { if (listenTimerRef.current) clearTimeout(listenTimerRef.current); } catch {}
        if (text) {
          setInput('');
          await startOrNext(text);
        }
      };
      rec.onerror = () => { setListening(false); try { if (listenTimerRef.current) clearTimeout(listenTimerRef.current); } catch {} };
      rec.onend = () => {
        setListening(false);
        try { if (listenTimerRef.current) clearTimeout(listenTimerRef.current); } catch {}
        clearPrepCountdown();
        if (!recognizedRef.current && autoAdvanceOnSilence) {
          // add a local note then move on
          setTranscript((prev) => [...prev, { role: 'interviewer', content: 'No answer detected. Moving onâ€¦' }]);
          startOrNext('');
        }
      };
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const stopSpeaking = () => {
    try { if (supportsTTS) window.speechSynthesis.cancel(); } catch {}
  };

  const stopInterview = () => {
    setSessionStopped(true);
    try { if (recognitionRef.current) recognitionRef.current.stop(); } catch {}
    stopSpeaking();
    clearPrepCountdown();
    try { if (listenTimerRef.current) clearTimeout(listenTimerRef.current); } catch {}
    setListening(false);
  };

  const resumeInterview = () => {
    setSessionStopped(false);
    // Optionally repeat last question and auto-listen
    if (lastQuestionRef.current) {
      if (ttsEnabled) speakNow(lastQuestionRef.current, { onend: () => { if (autoListen) startPrepCountdown(); } });
      else if (autoListen) startPrepCountdown();
    }
  };

  const avgScorePct = useMemo(() => {
    if (!runningScore.count) return null;
    return Math.round((runningScore.sum / runningScore.count) * 100);
  }, [runningScore]);

  return (
    <section className="mt-6 grid grid-cols-1 gap-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:ring-gray-800">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Virtual AI Interviewer</h2>
        <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">Interactive, adaptive Q&A with instant feedback. One question at a time.</p>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 dark:text-gray-200">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., DBMS indexing and transactions"
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            />
            <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">Optional: add a topic for better targeting</div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 dark:text-gray-200">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 dark:text-gray-200">Style</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            >
              <option value="technical">Technical</option>
              <option value="behavioral">Behavioral (STAR)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 dark:text-gray-200">Max Questions</label>
            <input
              type="number"
              min="1"
              max="20"
              value={maxQuestions}
              onChange={(e) => setMaxQuestions(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Primary action bar */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={handleStart}
            disabled={!canStart || busy}
            className={`rounded-2xl px-4 py-2 font-semibold shadow-sm transition ${
              canStart && !busy ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400'
            }`}
            aria-label="Start Interview (S)"
            title="Start (S)"
          >
            {busy && transcript.length === 0 ? 'Starting...' : 'Start Interview'}
          </button>
          {transcript.length > 0 && !sessionStopped && (
            <button
              onClick={stopInterview}
              disabled={busy}
              className="rounded-2xl px-3 py-2 text-sm bg-rose-600 text-white hover:bg-rose-700"
              aria-label="Stop interview"
              title="Stop interview"
            >
              <span aria-hidden>⛔</span><span className="sr-only">Stop</span>
            </button>
          )}
          {transcript.length > 0 && sessionStopped && (
            <button
              onClick={resumeInterview}
              disabled={busy}
              className="rounded-2xl px-3 py-2 text-sm bg-emerald-600 text-white hover:bg-emerald-700"
              aria-label="Resume interview"
              title="Resume"
            >
              Resume
            </button>
          )}
          {transcript.length > 0 && (
            <button
              onClick={resetSession}
              disabled={busy}
              className="rounded-2xl px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
              aria-label="Reset session"
              title="Reset"
            >
              Reset
            </button>
          )}
          {avgScorePct != null && (
            <div className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              Avg {avgScorePct}%
            </div>
          )}
          {supportsTTS && ttsEnabled && (
            <button
              onClick={() => speakNow(lastQuestionRef.current)}
              className="rounded-2xl px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
              aria-label="Repeat question (R)"
              title="Repeat (R)"
            >
              <span aria-hidden>🔁</span><span className="sr-only">Repeat question</span>
            </button>
          )}
        </div>

        {/* Collapsible Settings */}
        <details className="mt-3">
          <summary className="cursor-pointer select-none text-sm text-gray-700 dark:text-gray-300">Settings</summary>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Voice toggles */}
            {supportsTTS && (
              <div className="flex items-center gap-2">
                <input id="set-tts" type="checkbox" checked={ttsEnabled} onChange={(e) => setTtsEnabled(e.target.checked)} />
                <label htmlFor="set-tts" className="text-sm text-gray-700 dark:text-gray-300">TTS (speak questions)</label>
              </div>
            )}
            {supportsTTS && (
              <div className="flex items-center gap-2">
                <input id="set-feedback" type="checkbox" checked={speakFeedback} onChange={(e) => setSpeakFeedback(e.target.checked)} disabled={!ttsEnabled} />
                <label htmlFor="set-feedback" className="text-sm text-gray-700 dark:text-gray-300">Feedback (voice)</label>
              </div>
            )}
            {supportsASR && (
              <div className="flex items-center gap-2">
                <input id="set-autolisten" type="checkbox" checked={autoListen} onChange={(e) => setAutoListen(e.target.checked)} />
                <label htmlFor="set-autolisten" className="text-sm text-gray-700 dark:text-gray-300">Auto listen after question</label>
              </div>
            )}
            {supportsASR && (
              <div className="flex items-center gap-2">
                <input id="set-auto-advance" type="checkbox" checked={autoAdvanceOnSilence} onChange={(e) => setAutoAdvanceOnSilence(e.target.checked)} />
                <label htmlFor="set-auto-advance" className="text-sm text-gray-700 dark:text-gray-300">Auto-advance on silence</label>
              </div>
            )}
            {supportsASR && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-300">Prep time (sec)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={prepTimeSec}
                  onChange={(e) => setPrepTimeSec(parseInt(e.target.value || 0, 10))}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                />
              </div>
            )}
            {supportsASR && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-300">Silence timeout (ms)</label>
                <input
                  type="number"
                  min="2000"
                  max="20000"
                  step="500"
                  value={silenceMs}
                  onChange={(e) => setSilenceMs(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                />
              </div>
            )}

            {/* Language and Voice selection */}
            {supportsASR && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-300">Language</label>
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                >
                  {[...new Set([selectedLang, ...LANG_OPTIONS])].map((lc) => (
                    <option key={lc} value={lc}>{lc}</option>
                  ))}
                </select>
              </div>
            )}
            {supportsTTS && (
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-300">Voice</label>
                <select
                  value={selectedVoiceURI}
                  onChange={(e) => setSelectedVoiceURI(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                >
                  {(() => {
                    const filtered = voices && voices.length
                      ? (voices.filter(v => (v.lang || '').toLowerCase().startsWith((selectedLang || '').toLowerCase())) || voices)
                      : [];
                    const list = filtered.length ? filtered : voices;
                    return list.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                    ));
                  })()}
                </select>
              </div>
            )}

            {supportsTTS && (
              <div className="flex items-center gap-2">
                <button onClick={stopSpeaking} className="rounded-2xl px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200">Stop speaking</button>
              </div>
            )}
          </div>
        </details>

        {/* Error banner */}
        {/* error banner shown below once; avoid duplicates */}

        {error && (
          <div className="mt-3 rounded-2xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
            {error}
          </div>
        )}

        {/* Chat area */}
        <div ref={chatRef} className="mt-6 h-[420px] overflow-y-auto rounded-2xl border border-gray-200 p-4 dark:border-gray-800 bg-white dark:bg-gray-900">
          {transcript.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">No messages yet. Click Start Interview to begin.</div>
          )}
          {transcript.map((t, i) => (
            <div key={i} className={`mb-3 flex ${t.role === 'candidate' ? 'justify-end' : 'justify-start'}`}>
              <div className={`${t.role === 'candidate' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'} max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm shadow-sm`}>
                <div className="opacity-80 text-[11px] mb-0.5">{t.role === 'candidate' ? 'You' : 'Interviewer'}</div>
                {t.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="text-xs text-gray-500" aria-live="polite">Interviewer is thinking...</div>
          )}
          <div ref={endRef} />
        </div>

        {/* Latest Feedback / Coaching */}
        {lastEvaluation && (
          <div className="mt-3 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
            <div className="text-sm font-semibold text-gray-800 mb-2 dark:text-gray-100">Latest Feedback</div>
            {lastEvaluation.lastAnswerScore != null && (
              <div className="mb-2 text-sm text-gray-700 dark:text-gray-300">Score: {Math.round(Number(lastEvaluation.lastAnswerScore) * 100)}%</div>
            )}
            {lastEvaluation.feedback && (
              <div className="mb-2 text-sm text-gray-700 dark:text-gray-300">{lastEvaluation.feedback}</div>
            )}
            {!!(lastEvaluation.strengths || []).length && (
              <div className="mb-2 text-xs text-gray-600 dark:text-gray-300">Strengths: {lastEvaluation.strengths.join('; ')}</div>
            )}
            {!!(lastEvaluation.weaknesses || []).length && (
              <div className="mb-2 text-xs text-gray-600 dark:text-gray-300">Weaknesses: {lastEvaluation.weaknesses.join('; ')}</div>
            )}
            {lastEvaluation.corrections && (
              <div className="text-xs text-gray-600 dark:text-gray-300">Corrections: {lastEvaluation.corrections}</div>
            )}
          </div>
        )}

        {/* Sticky Composer: Mic + Text + Send */}
        <div className="mt-3 sticky bottom-2 z-10 rounded-2xl border border-gray-200 bg-white/90 p-2 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
          <div className="flex items-center gap-2">
            {supportsASR && transcript.length > 0 && (
              <button
                onClick={listening ? stopListening : startListeningFullAnswer}
                disabled={busy || transcript.length === 0}
                className={`rounded-2xl px-3 py-2 text-sm ${listening ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200'}`}
                aria-label={listening ? 'Stop voice capture (M)' : 'Answer by voice (M)'}
                title={listening ? 'Stop (M)' : 'Mic (M)'}
              >
                <span aria-hidden>{listening ? '⏹️' : '🎤'}</span>
                <span className="sr-only">{listening ? 'Stop voice capture' : 'Answer by voice'}</span>
              </button>
            )}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your answer and press Enter"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              disabled={busy || transcript.length === 0}
              className="flex-1 rounded-2xl border border-gray-300 bg-white px-4 py-2.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            />
            <button
              onClick={handleSend}
              disabled={busy || !input.trim() || transcript.length === 0}
              className={`rounded-2xl px-4 py-2 font-semibold shadow-sm transition ${
                !busy && input.trim() && transcript.length > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              Send
            </button>
          </div>
          {prepCountdownSec > 0 && (
            <div className="mt-2 inline-flex items-center gap-2 text-xs rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 dark:bg-indigo-900/30 dark:text-indigo-200">
              Listening starts in {prepCountdownSec}s
              <button onClick={() => { clearPrepCountdown(); startListeningFullAnswer(); }} className="underline">Skip</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
