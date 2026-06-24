'use client';

import { UserRound } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 text-center px-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <UserRound className="size-7 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-foreground">Profile</h2>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xs leading-relaxed">
          Your profile page is coming soon.
        </p>
      </div>
    </div>
  );
}
