import { URI } from 'utils/generalUtils';

interface Donor {
  id: string;
  display_name: string;
  message: string | null;
  donated_at: string;
}

async function getDonors(): Promise<Donor[]> {
  try {
    const res = await fetch(URI('/donations'), { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data ?? [];
  } catch {
    return [];
  }
}

export async function DonorBanner() {
  const donors = await getDonors();
  if (donors.length === 0) return null;

  const names = donors.map((d) => d.display_name).join(', ');

  return (
    <div className="w-full bg-muted/50 border-b border-border/30 py-1.5 px-4 text-center text-xs text-muted-foreground">
      <span>
        {'❤ Thanks to our Ko-Fi supporters: '}
        <span className="font-medium text-foreground/80">{names}</span>
        {' — '}
        <a
          href="https://ko-fi.com/interstella0"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Support us on Ko-Fi!
        </a>
      </span>
    </div>
  );
}
