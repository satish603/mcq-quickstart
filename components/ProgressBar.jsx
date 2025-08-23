// components/ProgressBar.jsx
export default function ProgressBar({ value = 0 }) {
  return (
    <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
      <div
        className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
