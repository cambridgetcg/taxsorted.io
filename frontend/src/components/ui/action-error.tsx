export function ActionError({
  message,
  technical,
  className = "",
}: {
  message: string;
  technical?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`rounded-xl border border-red-300 bg-red-50 p-3 text-red-800 ${className}`}
    >
      <p className="text-sm">{message}</p>
      {technical ? (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer font-medium">Technical detail</summary>
          <p className="mt-1 break-words">{technical}</p>
        </details>
      ) : null}
    </div>
  );
}
