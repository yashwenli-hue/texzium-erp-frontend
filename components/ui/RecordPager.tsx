"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Neighbours, neighboursIn, readSequence } from "../../lib/ui/recordSequence";

/**
 * "3 of 20 in Pre-Sales · Needs an owner  ‹ ›": the list this record was opened from, and the
 * records either side of it in that list. Absent when the record was not opened from a list.
 * Real links, so they work from the keyboard and open in a new tab; read after mount so the server
 * and the first client render match.
 */
export function RecordPager({ kind, id, hrefOf }: { kind: string; id: string; hrefOf: (id: string) => string }) {
  const [n, setN] = useState<Neighbours | null>(null);
  useEffect(() => setN(neighboursIn(readSequence(kind), id)), [kind, id]);
  if (!n) return null;
  return (
    <nav className="record-pager" aria-label="Records in this list">
      <Link href={n.from} className="rp-list">
        {n.position} of {n.total} in {n.label}
      </Link>
      {n.prev ? (
        <Link href={hrefOf(n.prev)} className="icon-btn sm" aria-label="Previous in this list" rel="prev">
          <Icon name="back" size={14} />
        </Link>
      ) : (
        <span className="icon-btn sm is-off" aria-hidden="true"><Icon name="back" size={14} /></span>
      )}
      {n.next ? (
        <Link href={hrefOf(n.next)} className="icon-btn sm" aria-label="Next in this list" rel="next">
          <Icon name="arrow" size={14} />
        </Link>
      ) : (
        <span className="icon-btn sm is-off" aria-hidden="true"><Icon name="arrow" size={14} /></span>
      )}
    </nav>
  );
}
