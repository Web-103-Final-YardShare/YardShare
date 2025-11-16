export function LoadingSpinner({ size = 'md', text = '' }) {
  const sizeClasses = {
    sm: 'size-4',
    md: 'size-12',
    lg: 'size-16'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeClasses[size]} border-4 border-emerald-600 border-t-transparent rounded-full animate-spin`}></div>
      {text && <p className="text-gray-600">{text}</p>}
    </div>
  );
}
