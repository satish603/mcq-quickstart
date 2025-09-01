// components/AiMcqGenerator.jsx
import { useState, useMemo, useEffect } from 'react';
import { TENANT } from '../lib/siteConfig';
import QuizQuestion from './QuizQuestion';
import ResultSummary from './ResultSummary';

export default function AiMcqGenerator() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [base64, setBase64] = useState('');
  const [mimeType, setMimeType] = useState('');
  const [pdfBase64, setPdfBase64] = useState('');
  const [pdfName, setPdfName] = useState('');
  const [sourceType, setSourceType] = useState('image'); // image | prompt | pdf
  const [promptText, setPromptText] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { questions: [...] }
  const [paperName, setPaperName] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);
  const [savedId, setSavedId] = useState('');
  const [tab, setTab] = useState('json'); // json | edit | preview

  // preview/test state
  const [pvIdx, setPvIdx] = useState(0);
  const [pvSelected, setPvSelected] = useState([]);
  const [pvPeeked, setPvPeeked] = useState([]);
  const [pvBookmarked, setPvBookmarked] = useState([]);
  const [pvDone, setPvDone] = useState(false);

  // default author from home page user id + draft loader
  useEffect(() => {
    try {
      const uid = localStorage.getItem('mcq_user_id');
      if (uid && !authorId) setAuthorId(uid);
      const draft = localStorage.getItem('ai_mcq_draft');
      if (!result && draft) {
        const parsed = JSON.parse(draft);
        if (Array.isArray(parsed?.questions)) setResult({ questions: parsed.questions });
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      if (result?.questions?.length) localStorage.setItem('ai_mcq_draft', JSON.stringify(result));
    } catch {}
  }, [result]);

  const canGenerate = useMemo(() => {
    if (loading) return false;
    if (sourceType === 'prompt') return promptText.trim().length >= 8;
    if (sourceType === 'pdf') return !!pdfBase64;
    return !!base64 && !!mimeType; // image
  }, [loading, sourceType, promptText, pdfBase64, base64, mimeType]);

  const handleImageChange = (e) => {
    setError('');
    setResult(null);
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      setPreviewUrl('');
      setBase64('');
      setMimeType('');
      return;
    }
    if (!f.type.startsWith('image/')) {
      setError('Please select an image file (PNG/JPG/WEBP).');
      return;
    }
    setFile(f);
    setMimeType(f.type);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setPreviewUrl(String(dataUrl));
      // dataUrl looks like: data:image/png;base64,AAAA...
      const commaIdx = String(dataUrl).indexOf(',');
      const b64 = commaIdx > -1 ? String(dataUrl).slice(commaIdx + 1) : '';
      setBase64(b64);
    };
    reader.onerror = () => setError('Failed to read image.');
    reader.readAsDataURL(f);
  };

  const handlePdfChange = (e) => {
    setError('');
    setResult(null);
    const f = e.target.files?.[0];
    if (!f) {
      setPdfBase64('');
      setPdfName('');
      return;
    }
    if (f.type !== 'application/pdf') {
      setError('Please select a PDF file.');
      return;
    }
    setPdfName(f.name);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result; // data:application/pdf;base64,....
      const commaIdx = String(dataUrl).indexOf(',');
      const b64 = commaIdx > -1 ? String(dataUrl).slice(commaIdx + 1) : '';
      setPdfBase64(b64);
    };
    reader.onerror = () => setError('Failed to read PDF.');
    reader.readAsDataURL(f);
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const payload = { numQuestions: Number(numQuestions) || 10 };
      if (sourceType === 'prompt') {
        payload.prompt = promptText;
      } else if (sourceType === 'pdf') {
        payload.pdfBase64 = pdfBase64;
        payload.mimeType = 'application/pdf';
      } else {
        payload.imageBase64 = base64;
        payload.mimeType = mimeType;
      }

      const res = await fetch('/api/generate-mcq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to generate MCQs.');
      }
      const data = await res.json();
      if (!data || !Array.isArray(data.questions)) {
        throw new Error('Unexpected response shape from AI.');
      }
      setResult({ questions: data.questions });
      setTab('edit');
    } catch (e) {
      setError(e?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // --- editing helpers ---
  const updateQuestion = (idx, patch) => {
    setResult((prev) => {
      if (!prev) return prev;
      const qs = [...prev.questions];
      qs[idx] = { ...qs[idx], ...patch };
      return { questions: qs };
    });
  };
  const updateOption = (qIdx, optIdx, value) => {
    setResult((prev) => {
      if (!prev) return prev;
      const qs = [...prev.questions];
      const q = { ...qs[qIdx] };
      const opts = Array.isArray(q.options) ? [...q.options] : ['', '', '', ''];
      opts[optIdx] = value;
      q.options = opts;
      qs[qIdx] = q;
      return { questions: qs };
    });
  };
  const addQuestion = () => {
    setResult((prev) => {
      const qs = prev?.questions ? [...prev.questions] : [];
      qs.push({ id: qs.length + 1, text: '', options: ['', '', '', ''], answerIndex: 0, explanation: '' });
      return { questions: qs };
    });
  };
  const removeQuestion = (idx) => {
    setResult((prev) => {
      if (!prev) return prev;
      const qs = [...prev.questions];
      qs.splice(idx, 1);
      return { questions: qs.map((q, i) => ({ ...q, id: q.id ?? i + 1 })) };
    });
  };

  // preview helpers
  const startPreview = () => {
    if (!result?.questions?.length) return;
    setPvIdx(0);
    setPvSelected(new Array(result.questions.length).fill(undefined));
    setPvPeeked(new Array(result.questions.length).fill(false));
    setPvBookmarked(new Array(result.questions.length).fill(false));
    setPvDone(false);
  };
  useEffect(() => {
    if (tab === 'preview') startPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    } catch {
      // ignore
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `ai-generated-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToCommunity = async () => {
    if (!result) return;
    if (!paperName.trim()) { setError('Please enter a paper name.'); return; }
    if (!authorId.trim()) { setError('Please enter your user ID.'); return; }
    setSaveBusy(true);
    setError('');
    try {
      const res = await fetch('/api/papers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: paperName.trim(), userId: authorId.trim(), tenant: TENANT, questions: result.questions })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSavedId(data.id);
    } catch (e) {
      setError(e?.message || 'Failed to save.');
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Source & Uploader */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:ring-gray-800">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">AI MCQ Generator</h2>
        <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
          Upload an image with questions or study notes. Gemini will extract and
          convert it into structured MCQs.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 dark:text-gray-200">Source</label>
            <div className="flex flex-wrap gap-2">
              {['image','prompt','pdf'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSourceType(t)}
                  className={`rounded-2xl px-3 py-2 text-sm font-medium transition ring-1 ${
                    sourceType === t
                      ? 'bg-indigo-600 text-white ring-indigo-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 ring-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700'
                  }`}
                >
                  {t === 'image' ? 'Image' : t === 'prompt' ? 'Prompt/Topic' : 'PDF'}
                </button>
              ))}
            </div>
          </div>

          <div>
            {sourceType === 'image' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 dark:text-gray-200">Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                />
                {previewUrl && (
                  <div className="mt-3">
                    <img src={previewUrl} alt="Preview" className="max-h-64 rounded-xl border border-gray-200 dark:border-gray-800" />
                  </div>
                )}
              </div>
            )}

            {sourceType === 'prompt' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 dark:text-gray-200">Topic / Prompt</label>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="e.g., Operating Systems scheduling algorithms with focus on Round Robin and Priority Scheduling"
                  rows={4}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">Minimum 8 characters. Include topics, difficulty, and constraints if needed.</p>
              </div>
            )}

            {sourceType === 'pdf' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 dark:text-gray-200">PDF</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfChange}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                />
                {pdfName && (
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">Selected: {pdfName}</div>
                )}
                <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">Large PDFs may take longer. First ~20MB supported.</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 dark:text-gray-200">Number of Questions</label>
            <input
              type="number"
              min="1"
              max="50"
              value={numQuestions}
              onChange={(e) => setNumQuestions(e.target.value)}
              className="w-40 rounded-2xl border border-gray-300 bg-white px-4 py-2.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className={`rounded-2xl px-4 py-3 font-semibold shadow-sm transition ${
              canGenerate ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {loading ? 'Generating…' : 'Generate MCQs'}
          </button>
        </div>
      </div>

      {/* Right: Output */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:ring-gray-800">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Output</h3>
        {!result && (
          <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">No output yet. Generate to preview JSON here.</p>
        )}
        {result && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-300">{result.questions?.length || 0} questions</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTab('json')}
                  className={`rounded-xl px-3 py-1.5 text-sm ${tab === 'json' ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200'}`}
                >JSON</button>
                <button
                  onClick={() => setTab('edit')}
                  className={`rounded-xl px-3 py-1.5 text-sm ${tab === 'edit' ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200'}`}
                >Edit</button>
                <button
                  onClick={() => setTab('preview')}
                  className={`rounded-xl px-3 py-1.5 text-sm ${tab === 'preview' ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200'}`}
                >Preview</button>
              </div>
            </div>

            {tab === 'json' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button onClick={handleCopy} className="rounded-xl px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200">Copy JSON</button>
                  <button onClick={handleDownload} className="rounded-xl px-3 py-1.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700">Download .json</button>
                </div>
                <pre className="max-h-[480px] overflow-auto rounded-xl bg-gray-50 p-3 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-100"><code>{JSON.stringify(result, null, 2)}</code></pre>
                <div className="text-xs text-gray-500 dark:text-gray-400">Tip: Save under <code>/public/questions/...</code> and register in <code>/data/paperList.js</code>.</div>
              </div>
            )}

            {tab === 'edit' && (
              <div className="space-y-4">
                {result.questions.map((q, i) => (
                  <div key={i} className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">Q{i + 1}</div>
                      <button onClick={() => removeQuestion(i)} className="text-rose-600 text-sm hover:underline">Remove</button>
                    </div>
                    <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-300">Question</label>
                    <textarea
                      value={q.text}
                      onChange={(e) => updateQuestion(i, { text: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                      rows={3}
                    />
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[0,1,2,3].map((idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input type="radio" name={`ans-${i}`} checked={q.answerIndex === idx} onChange={() => updateQuestion(i, { answerIndex: idx })} className="h-4 w-4 accent-indigo-600" />
                          <input type="text" value={q.options?.[idx] ?? ''} onChange={(e) => updateOption(i, idx, e.target.value)} placeholder={`Option ${idx + 1}`} className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-300">Explanation (optional)</label>
                      <textarea value={q.explanation || ''} onChange={(e) => updateQuestion(i, { explanation: e.target.value })} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" rows={2} />
                    </div>
                  </div>
                ))}
                <div>
                  <button onClick={addQuestion} className="rounded-xl px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200">+ Add Question</button>
                </div>
              </div>
            )}

            {tab === 'preview' && (
              <div className="space-y-4">
                {!pvDone ? (
                  <QuizQuestion
                    question={result.questions[pvIdx]}
                    questionIndex={pvIdx}
                    total={result.questions.length}
                    selectedOption={pvSelected[pvIdx]}
                    onSelectOption={(v) => setPvSelected((a) => { const b=[...a]; b[pvIdx]=v; return b; })}
                    onPrev={() => setPvIdx((i) => Math.max(0, i-1))}
                    onNext={() => { if (pvIdx === result.questions.length - 1) setPvDone(true); else setPvIdx((i) => Math.min(result.questions.length-1, i+1)); }}
                    onPeek={() => setPvPeeked((a) => { const b=[...a]; b[pvIdx]=true; return b; })}
                    isPeeked={!!pvPeeked[pvIdx]}
                    isBookmarked={!!pvBookmarked[pvIdx]}
                    onToggleBookmark={() => setPvBookmarked((a) => { const b=[...a]; b[pvIdx]=!b[pvIdx]; return b; })}
                    highlight={''}
                  />
                ) : (
                  <ResultSummary
                    selected={pvSelected}
                    peeked={pvPeeked}
                    bookmarked={pvBookmarked}
                    questions={result.questions}
                    negativeMark={0}
                    onRetry={() => { setPvDone(false); startPreview(); }}
                  />
                )}
              </div>
            )}
            <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
              <div className="text-sm font-semibold text-gray-800 mb-2 dark:text-gray-100">Save to Community (shared)</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-300">Paper Name</label>
                  <input
                    type="text"
                    value={paperName}
                    onChange={(e) => setPaperName(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 dark:text-gray-300">Your User ID</label>
                  <input
                    type="text"
                    value={authorId}
                    onChange={(e) => setAuthorId(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleSaveToCommunity}
                    disabled={saveBusy}
                    className={`w-full rounded-xl px-4 py-2 font-semibold shadow-sm transition ${saveBusy ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                  >
                    {saveBusy ? 'Saving�?�' : 'Save to Community'}
                  </button>
                </div>
              </div>
              {savedId && (
                <div className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                  Saved! Shareable link: <code className="bg-gray-100 px-1 py-0.5 rounded dark:bg-gray-800">/quiz?paper=db:{savedId}</code>
                  <div className="mt-1">
                    <a
                      href={`/quiz?paper=db:${savedId}`}
                      className="inline-block rounded-lg bg-indigo-600 text-white px-3 py-1 text-xs hover:bg-indigo-700"
                    >
                      Open in Quiz
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
