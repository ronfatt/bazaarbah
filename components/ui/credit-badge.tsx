export function CreditBadge({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#00C2A8]/20 bg-[#00C2A8]/10 px-3 py-1 text-xs font-medium text-[#00C2A8]">
      {label}: {value}
    </span>
  );
}
