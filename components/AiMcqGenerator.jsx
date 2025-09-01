// components/AiMcqGenerator.jsx
import { useState, useMemo } from 'react';

export default function AiMcqGenerator() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [base64, setBase64] = useState('');
  const [mimeType, setMimeType] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { questions: [...] }

  const canGenerate = useMemo(() => !!base64 && !!mimeType && !loading, [base64, mimeType, loading]);

  const handleFileChange = (e) => {
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

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/generate-mcq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType, numQuestions: Number(numQuestions) || 10 }),
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
    } catch (e) {
      setError(e?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Uploader */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:ring-gray-800">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">AI MCQ Generator</h2>
        <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
          Upload an image with questions or study notes. Gemini will extract and
          convert it into structured MCQs.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 dark:text-gray-200">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            />
            {previewUrl && (
              <div className="mt-3">
                <img src={previewUrl} alt="Preview" className="max-h-64 rounded-xl border border-gray-200 dark:border-gray-800" />
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
                  onClick={handleCopy}
                  className="rounded-xl px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
                >
                  Copy JSON
                </button>
                <button
                  onClick={handleDownload}
                  className="rounded-xl px-3 py-1.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Download .json
                </button>
              </div>
            </div>
            <pre className="max-h-[480px] overflow-auto rounded-xl bg-gray-50 p-3 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-100"><code>{JSON.stringify(result, null, 2)}</code></pre>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Tip: To use in the app, save this file under <code>/public/questions/...</code> and add an entry in <code>/data/paperList.js</code>.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

