// Version inside an editorial kicker: the short code (e.g. "v2.0") on narrow screens, the full release name from `sm`
// up. Both come from the single release metadata source.
export function KickerVersion({ version }: { version: string }) {
  const short = version.split(" ")[0];
  return (
    <>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{version}</span>
    </>
  );
}
