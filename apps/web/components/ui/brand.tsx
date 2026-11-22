export function Brand({ href = '#home' }: { href?: string }) {
  return (
    <a href={href} className="brand" aria-label="Gulf Pharmacy | صيدلية الخليج">
      <span className="brand-mark" aria-hidden="true">
        ✚
      </span>
      <span>
        <strong>GULF PHARMACY</strong>
        <span lang="ar" dir="rtl">
          صيدلية الخليج
        </span>
      </span>
    </a>
  );
}
