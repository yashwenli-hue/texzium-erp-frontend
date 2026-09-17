"use client";

import { useMemo, useState } from "react";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Who } from "../../components/ui/Who";
import { StatusTag, ChipGroup, Chip } from "../../components/ui/Tag";
import { DataTable, Column } from "../../components/ui/DataTable";
import { Pagination, paginate } from "../../components/ui/Button";
import { ContactForm } from "../../components/forms/ContactForm";
import { useContacts } from "../../lib/hooks/useContacts";
import { Contact, ContactType } from "../../lib/types/domain";
import { formatDate } from "../../lib/format";

const PAGE_SIZE = 6;
const TYPES: ContactType[] = ["Decision Maker", "Champion", "Influencer"];

export default function ContactsPage() {
  const { contacts: allContacts, createContact } = useContacts();
  const [showForm, setShowForm] = useState(false);
  const [typeChip, setTypeChip] = useState("All");
  const [page, setPage] = useState(1);

  const typeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allContacts.forEach((c) => (map[c.type] = (map[c.type] ?? 0) + 1));
    return map;
  }, [allContacts]);

  const filtered = typeChip === "All" ? allContacts : allContacts.filter((c) => c.type === typeChip);
  const pageRows = paginate(filtered, page, PAGE_SIZE);

  const columns: Column<Contact>[] = [
    { key: "name", header: "Contact", render: (c) => <Who name={c.name} sub={c.email} /> },
    { key: "companyName", header: "Company", render: (c) => c.companyName },
    { key: "title", header: "Title", render: (c) => c.title },
    { key: "type", header: "Type", render: (c) => <StatusTag status={c.type} /> },
    { key: "phone", header: "Phone", render: (c) => c.phone },
    { key: "lastContactedAt", header: "Last Contacted", render: (c) => (c.lastContactedAt ? formatDate(c.lastContactedAt) : "—") },
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="RevenueOS · Contacts"
        title="Contacts"
        subtitle="Every individual you deal with, across leads and customer accounts."
        cta={
          <Button variant="primary" icon="plus" onClick={() => setShowForm(true)}>
            New Contact
          </Button>
        }
      />

      <ChipGroup>
        <Chip label={`All ${allContacts.length}`} active={typeChip === "All"} onClick={() => { setTypeChip("All"); setPage(1); }} />
        {TYPES.filter((t) => typeCounts[t]).map((t) => (
          <Chip key={t} label={`${t} ${typeCounts[t]}`} active={typeChip === t} onClick={() => { setTypeChip(t); setPage(1); }} />
        ))}
      </ChipGroup>

      <div style={{ marginTop: 14 }}>
        <Panel title="Contact Directory" flush>
          <DataTable columns={columns} rows={pageRows} emptyTitle="No contacts match this filter" />
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </Panel>
      </div>

      <DesignNote>
        <b>Design note.</b> Contacts is the people-first view — the same humans who show up inside
        Leads and Customers, listed once so reps don&apos;t have to remember which account a person
        belongs to.
      </DesignNote>

      {showForm && <ContactForm onClose={() => setShowForm(false)} onSubmit={createContact} />}
    </div>
  );
}
