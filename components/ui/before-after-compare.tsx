export function BeforeAfterCompare({
  originalUrl,
  enhancedUrl,
}: {
  originalUrl: string;
  enhancedUrl: string;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-2 rounded-xl border border-white/10 bg-[#163C33]/60 p-3">
        <p className="text-xs font-medium text-white/60">Original</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={originalUrl} alt="Original" className="h-40 w-full rounded-lg border border-white/10 object-cover" />
      </div>
      <div className="space-y-2 rounded-xl border border-[#00C2A8]/30 bg-[#163C33]/70 p-3">
        <p className="text-xs font-medium text-[#00C2A8]">Enhanced</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={enhancedUrl} alt="Enhanced" className="h-40 w-full rounded-lg border border-[#00C2A8]/20 object-cover" />
      </div>
    </div>
  );
}
