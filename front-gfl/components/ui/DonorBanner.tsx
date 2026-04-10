import Link from 'next/link';
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

  const sorted = [...donors].sort(
    (a, b) => new Date(b.donated_at).getTime() - new Date(a.donated_at).getTime(),
  );

  const shown = sorted.slice(0, 3);
  const remaining = sorted.length - shown.length;

  const names = shown.map((d) => d.display_name).join(', ');
  const suffix = remaining > 0 ? ` +${remaining} more` : '';

  return (
    <div className="w-full bg-muted/50 border-b border-border/30 py-1.5 px-4 text-center text-xs text-muted-foreground">
      <span>
        {'❤ Thanks to our supporters: '}
        <span className="font-medium text-foreground/80">{names}{suffix}</span>
        {' — '}
        <Link
          href="/donors"
          className="underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Support us!
        </Link>
      </span>
    </div>
  );
}
