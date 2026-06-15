import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  section?: string;
}

export function PlaceholderPage({ title, section }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col h-full min-h-0 items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
        <Construction className="size-6 text-muted-foreground" />
      </div>
      {section && (
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {section}
        </p>
      )}
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground max-w-xs">
        This page is under construction and will be available soon.
      </p>
    </div>
  );
}
