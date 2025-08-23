// components/ThemeToggle.jsx
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme') === 'dark';
    setDark(saved);
    document.documentElement.classList.toggle('dark', saved);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggle}
      className="rounded-xl px-3 py-1.5 text-sm font-medium bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 transition hover:opacity-90"
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
    >
      {dark ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}
