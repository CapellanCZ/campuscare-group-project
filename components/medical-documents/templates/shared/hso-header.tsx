import Image from "next/image"

export function HsoHeader({
  showNfgLogo = false,
  formCode,
}: {
  showNfgLogo?: boolean
  formCode?: string
}) {
  return (
    <header className="text-center text-black">
      <div className="flex items-center justify-center gap-4">
        <Image
          src="/documents/nu-logo.png"
          alt="National University"
          width={64}
          height={64}
          className="h-14 w-14 object-contain"
          unoptimized
        />
        {showNfgLogo ? (
          <Image
            src="/documents/nfg-logo.png"
            alt="Nationalian Friendship Games"
            width={64}
            height={64}
            className="h-14 w-14 object-contain"
            unoptimized
          />
        ) : null}
      </div>
      <p className="mt-2 text-xs font-semibold tracking-wide uppercase">
        National University — Health Services Office
      </p>
      <p className="text-[10px] text-neutral-700">
        551 M.F. Jhocson St., Sampaloc, Manila 1008 · Tel: (02) 8711-8336
      </p>
      {formCode ? (
        <p className="mt-1 text-[10px] text-neutral-600">{formCode}</p>
      ) : null}
    </header>
  )
}
