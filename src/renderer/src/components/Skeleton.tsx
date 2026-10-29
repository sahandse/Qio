/** Loading placeholders keep a panel's shape while state arrives. */
export function Skeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div
      className={`skeleton${className ? ` ${className}` : ''}`}
      role="status"
      aria-label="در حال بارگذاری"
    >
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} className="skeleton-line" style={{ width: `${[92, 74, 58][index % 3]}%` }} />
      ))}
    </div>
  )
}
