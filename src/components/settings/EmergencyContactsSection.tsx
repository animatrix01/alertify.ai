import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, Plus, Star, Trash2, Edit2, X, Check,
  Loader2, Users, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useEmergencyContacts, type EmergencyContact } from "@/hooks/use-emergency-contacts";
import { useAuth } from "@/hooks/use-auth";

// ── Contact form state ────────────────────────────────────────────────────────
type ContactForm = {
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
};

const EMPTY_FORM: ContactForm = { name: "", phone: "", relationship: "", is_primary: false };

// ── Main section ─────────────────────────────────────────────────────────────
export function EmergencyContactsSection() {
  const { user } = useAuth();
  const { contacts, loading, addContact, updateContact, deleteContact, setPrimary } =
    useEmergencyContacts();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmergencyContact | null>(null);
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!user) return null;

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (c: EmergencyContact) => {
    setEditing(c);
    setForm({
      name: c.name,
      phone: c.phone,
      relationship: c.relationship ?? "",
      is_primary: c.is_primary,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const submit = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.phone.trim()) { toast.error("Phone number is required"); return; }
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      relationship: form.relationship.trim() || null,
      is_primary: form.is_primary,
    };
    const { error } = editing
      ? await updateContact(editing.id, payload)
      : await addContact(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Contact updated" : "Contact added");
    closeModal();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await deleteContact(id);
    setDeletingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Contact removed");
  };

  const handleSetPrimary = async (id: string) => {
    await setPrimary(id);
    toast.success("Primary contact updated");
  };

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-strong rounded-2xl p-5 space-y-4"
      >
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emergency" />
            <h2 className="font-semibold">Emergency Contacts</h2>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </header>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background/40 p-5 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No emergency contacts added yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add contacts so responders can reach your family.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={openAdd}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add first contact
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {contacts.map((c) => (
                <motion.li
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="flex items-center gap-3 rounded-xl bg-background/50 px-3 py-3"
                >
                  {/* Primary star */}
                  <button
                    onClick={() => handleSetPrimary(c.id)}
                    aria-label={c.is_primary ? "Primary contact" : "Set as primary"}
                    className="shrink-0"
                  >
                    <Star
                      className={`h-4 w-4 transition-colors ${
                        c.is_primary
                          ? "fill-warning text-warning"
                          : "text-muted-foreground hover:text-warning"
                      }`}
                    />
                  </button>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      {c.is_primary && (
                        <span className="shrink-0 rounded-full bg-warning/10 text-warning text-[10px] px-1.5 py-0.5 font-medium">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                      <a
                        href={`tel:${c.phone}`}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        {c.phone}
                      </a>
                      {c.relationship && (
                        <span className="text-xs text-muted-foreground">· {c.relationship}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
                      aria-label="Edit contact"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-emergency hover:bg-emergency/10 transition-colors"
                      aria-label="Delete contact"
                    >
                      {deletingId === c.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </motion.section>

      {/* ── Add / Edit modal ── */}
      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) closeModal(); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit contact" : "Add emergency contact"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="ec-name">Name *</Label>
              <Input
                id="ec-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-phone">Phone number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="ec-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-rel">Relationship</Label>
              <Input
                id="ec-rel"
                value={form.relationship}
                onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
                placeholder="e.g. Mother, Friend, Doctor"
              />
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5 cursor-pointer">
              <Star
                className={`h-4 w-4 transition-colors ${
                  form.is_primary ? "fill-warning text-warning" : "text-muted-foreground"
                }`}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">Set as primary contact</p>
                <p className="text-xs text-muted-foreground">First contact shown to responders</p>
              </div>
              <input
                type="checkbox"
                checked={form.is_primary}
                onChange={(e) => setForm((f) => ({ ...f, is_primary: e.target.checked }))}
                className="h-4 w-4 accent-primary"
              />
            </label>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={submit} disabled={busy}>
                {busy
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Check className="mr-2 h-4 w-4" />}
                {editing ? "Save changes" : "Add contact"}
              </Button>
              <Button variant="outline" onClick={closeModal} disabled={busy}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
