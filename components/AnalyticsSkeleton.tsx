'use client';

export default function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Key Metrics Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass p-6 rounded-2xl animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-iki-grey/50" />
              <div className="h-4 w-24 bg-iki-grey/50 rounded" />
            </div>
            <div className="h-8 w-20 bg-iki-grey/50 rounded mb-2" />
            <div className="h-4 w-32 bg-iki-grey/50 rounded" />
          </div>
        ))}
      </div>

      {/* Chart Skeletons */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass p-6 rounded-2xl animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-5 h-5 rounded bg-iki-grey/50" />
            <div className="h-6 w-48 bg-iki-grey/50 rounded" />
          </div>
          <div className="h-[300px] bg-iki-grey/30 rounded" />
        </div>
      ))}
    </div>
  );
}
