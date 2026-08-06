export function SiteFooter() {
  return (
    <footer className="border-t border-[#ded8ce] bg-[#fbfaf7] px-5 py-6 text-sm text-[#62645f] sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-center sm:text-left">Trickle · Delivery that follows the journey.</p>
        <div className="flex flex-col gap-1 text-center text-xs text-[#77766f] sm:text-right">
          <p>Trickle is a product of <span className="font-semibold text-[#183b3a]">Maatli Tech Private Limited</span>.</p>
          <p>© 2026 Maatli Tech Private Limited. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}