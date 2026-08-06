export function MatchPreview() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-[#183b3a] p-6 text-white shadow-[0_20px_60px_rgba(24,59,58,0.18)] sm:p-8">
      <div className="absolute -right-16 -top-16 size-48 rounded-full border-[18px] border-[#e7b65c]/35" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div><p className="text-sm text-[#b9d0c6]">Next available match</p><p className="mt-2 text-2xl font-semibold">Delhi <span className="text-[#e7b65c]">→</span> Mumbai</p></div>
          <span className="rounded-full bg-[#b9d0c6]/15 px-3 py-1 text-xs text-[#d9ebe2]">Tomorrow</span>
        </div>
        <div className="my-10 flex items-center gap-3"><div className="size-3 rounded-full bg-[#e7b65c]" /><div className="h-px flex-1 bg-[#b9d0c6]/35" /><div className="size-3 rounded-full border-2 border-[#e7b65c]" /></div>
        <div className="grid grid-cols-2 gap-4 border-t border-[#b9d0c6]/20 pt-5 text-sm"><div><p className="text-[#b9d0c6]">Traveler</p><p className="mt-1 font-medium">Priya M.</p></div><div><p className="text-[#b9d0c6]">Arrives by</p><p className="mt-1 font-medium">18 May, 8 PM</p></div></div>
      </div>
    </div>
  );
}