"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextField, SelectField, FieldRow } from "../ui/FormField";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { CreateContactInput } from "../../lib/repository/interfaces";
import { ContactType } from "../../lib/types/domain";
import { FormError } from "../ui/FormError";

const TYPES: ContactType[] = ["Decision Maker", "Champion", "Influencer"];

export function ContactForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: CreateContactInput) => Promise<unknown>;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [type, setType] = useState<ContactType>("Influencer");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Contact name is required";
    if (!companyName.trim()) e.companyName = "Company name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = "Enter a valid email address";
    if (!phone.trim()) e.phone = "Phone number is required";
    if (!ownerName.trim()) e.ownerName = "Assign an owner";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        title: title.trim() || "—",
        companyName: companyName.trim(),
        type,
        email: email.trim(),
        phone: phone.trim(),
        ownerName: ownerName.trim(),
      });
      toast.success(`Contact "${name.trim()}" created`);
      onClose();
    } catch {
      setErrors({ form: "Something went wrong creating the contact. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="New Contact"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating…" : "Create Contact"}
          </Button>
        </>
      }
    >
      <FieldRow>
        <TextField label="Full Name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="e.g. Karan Mehta" />
        <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Head of Procurement" />
      </FieldRow>
      <FieldRow>
        <TextField label="Company" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} error={errors.companyName} placeholder="e.g. Sterling Pumps" />
        <SelectField label="Type" value={type} onChange={(e) => setType(e.target.value as ContactType)} options={TYPES.map((t) => ({ value: t, label: t }))} />
      </FieldRow>
      <FieldRow>
        <TextField label="Email" required value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} placeholder="name@company.com" />
        <TextField label="Phone" required value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} placeholder="+91 …" />
      </FieldRow>
      <TextField label="Owner" required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} error={errors.ownerName} placeholder="e.g. Vikram J." />
      <FormError message={errors.form} />
    </Modal>
  );
}
