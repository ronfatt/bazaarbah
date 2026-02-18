export function ImageUploader({
  uploading,
  onChange,
  previewUrl,
  label = "Upload Image",
}: {
  uploading: boolean;
  onChange: (file?: File) => void;
  previewUrl?: string;
  label?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="inline-flex cursor-pointer items-center rounded-xl border border-white/10 bg-[#163C33] px-4 py-2 text-sm text-white hover:bg-[#1c4a40]">
        {uploading ? "Uploading..." : label}
        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onChange(e.target.files?.[0])} />
      </label>
      {previewUrl ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Preview" className="h-14 w-14 rounded-lg border border-white/10 object-cover" />
          <p className="text-xs text-white/65">Original image ready</p>
        </div>
      ) : null}
    </div>
  );
}
