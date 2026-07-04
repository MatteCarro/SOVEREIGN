"use client";

import { CountryState } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Meter } from "@/components/ui/meter";

export function LeaderProfileCard({ country }: { country: CountryState }) {
  const leader = country.leader;
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-lg">{leader.name}</span>
          <span className="text-xs text-muted">{leader.age} anni</span>
        </div>
        <div className="text-xs text-muted">
          {leader.title} · {leader.ideology}
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {leader.traits.map((trait) => (
          <Badge key={trait} variant="accent">{trait}</Badge>
        ))}
        {country.politicalTraits.map((trait) => (
          <Badge key={trait} variant="muted">{trait}</Badge>
        ))}
      </div>
      <Meter label="Popolarità del leader" value={leader.popularity} hint="Quanto il leader è amato dal suo popolo." />
      <div className="space-y-1.5 text-xs">
        <p>
          <span className="text-muted">Ambizione: </span>
          <span className="italic">{leader.ambition}</span>
        </p>
        <p>
          <span className="text-muted">Debolezza: </span>
          <span className="italic">{leader.weakness}</span>
        </p>
      </div>
      <p className="text-[10px] text-faint">
        Leader immaginario di un mondo alternativo: nessun riferimento a persone reali.
      </p>
    </div>
  );
}
