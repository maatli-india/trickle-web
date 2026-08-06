export function ParcelSearch() {
  return (
    <section id="send" className="scroll-mt-8 border-t border-[#ded8ce] py-12 sm:py-16">
      <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#e85b43]">Start here</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">What are you moving?</h2></div><p className="max-w-sm text-sm leading-6 text-[#62645f]">Search by route and delivery target. Your parcel details stay attached to each match.</p></div>
      <div className="grid gap-3 rounded-2xl border border-[#ded8ce] bg-[#fbfaf7] p-3 sm:grid-cols-[1fr_1fr_0.8fr_auto] sm:items-end sm:p-4">
        <label className="text-xs font-semibold text-[#62645f]">From<input className="mt-2 w-full rounded-xl border border-[#d7d2c8] bg-white px-4 py-3 text-sm outline-none ring-[#e85b43] focus:ring-2" placeholder="Pickup city" /></label>
        <label className="text-xs font-semibold text-[#62645f]">To<input className="mt-2 w-full rounded-xl border border-[#d7d2c8] bg-white px-4 py-3 text-sm outline-none ring-[#e85b43] focus:ring-2" placeholder="Destination city" /></label>
        <label className="text-xs font-semibold text-[#62645f]">Deliver by<input className="mt-2 w-full rounded-xl border border-[#d7d2c8] bg-white px-4 py-3 text-sm outline-none ring-[#e85b43] focus:ring-2" placeholder="Choose a date" /></label>
        <button className="rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#285c59]">Find travelers</button>
      </div>
    </section>
  );
}