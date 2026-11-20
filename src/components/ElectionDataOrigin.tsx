"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { loadElectionHistoryIndex } from "@/lib/electionHistoryComparison";
import { RegistryDate } from "./ElectionDirectoryDetails";
import { workspaceToolLink } from "./workspaceLinks";

type ElectionReference = { country: string; id: string; date: string; endDate: string | null; chamber: string; dateNeedsCheck: boolean };

export function ElectionDataOrigin({ id, locale }: { id: string; locale: Locale }) {
  const [reference, setReference] = useState<ElectionReference | null>(null);
  const [unresolved, setUnresolved] = useState(false);
  useEffect(() => {
    let current = true;
    loadElectionHistoryIndex().then(index => {
      if (!current) return;
      for (const [country, elections] of Object.entries(index)) {
        const election = elections.find(row => row.id === id);
        if (election) {
          setReference({ country, id, date: election.date, endDate: election.history.endDate, chamber: election.chamber, dateNeedsCheck: election.history.dateBasis?.includes("background_to_verify") ?? false });
          return;
        }
      }
      setUnresolved(true);
    }).catch(() => { if (current) setUnresolved(true); });
    return () => { current = false; };
  }, [id]);
  if (unresolved) return <p role="status">{locale === "en" ? "The linked election could not be verified in the admitted archive." : "暂时无法在已收录的档案中核实所链接的选举。"}</p>;
  if (!reference) return null;
  return <p className="mt-2 text-sm" data-election-origin>
    <Link className="underline" href={workspaceToolLink("/politics/" + reference.country + "/", locale, { election: id })}>
      {locale === "en" ? "Return to election" : "返回选举记录"} · {reference.chamber} · <RegistryDate date={reference.date} awaitingConfirmation={reference.dateNeedsCheck} en={locale==="en"}/>{reference.endDate && reference.endDate!==reference.date && " – "+reference.endDate}
    </Link>
  </p>;
}
