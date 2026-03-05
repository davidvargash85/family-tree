import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Modal from "./Modal";

const schema = z
  .object({
    name: z.string().min(1, "Name is required").max(200),
    birthDate: z.string().optional().or(z.literal("")),
    deceased: z.boolean(),
    deathDate: z.string().optional().or(z.literal("")),
    bio: z.string().optional().nullable(),
  })
  .refine((data) => !data.deceased || (data.deathDate && data.deathDate.trim()), {
    message: "Death date is required when deceased is checked",
    path: ["deathDate"],
  });

const formStyles = {
  form: { display: "flex", flexDirection: "column", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 14, fontWeight: 500, color: "#374151" },
  input: {
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
  },
  inputError: { borderColor: "#dc2626" },
  error: { fontSize: 12, color: "#dc2626" },
  actions: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 },
  cancelBtn: {
    padding: "8px 16px",
    background: "#f3f4f6",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
  },
  submitBtn: {
    padding: "8px 16px",
    background: "#1e3a5f",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
  },
};

const defaultValues = { name: "", birthDate: "", deceased: false, deathDate: "", bio: "" };

export default function AddMemberModal({ open, onClose, onSubmit, isPending, linkContext }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const nameInputRef = useRef(null);

  // Reset form and focus first field whenever the modal opens
  useEffect(() => {
    if (open) {
      reset(defaultValues);
      const t = requestAnimationFrame(() => {
        nameInputRef.current?.focus();
      });
      return () => cancelAnimationFrame(t);
    }
  }, [open, reset]);

  const { ref: nameRegisterRef, ...nameRegisterRest } = register("name");
  const deceased = watch("deceased");

  const handleClose = () => {
    reset(defaultValues);
    onClose();
  };

  const onFormSubmit = (data) => {
    onSubmit({
      name: data.name.trim(),
      birthDate: data.birthDate?.trim() || null,
      deceased: !!data.deceased,
      deathDate: data.deceased ? (data.deathDate?.trim() || null) : null,
      bio: data.bio?.trim() || null,
    });
  };

  const title = linkContext
    ? linkContext.type === "parent"
      ? `Add child for ${linkContext.otherMemberName || "?"}`
      : `Add spouse for ${linkContext.otherMemberName || "?"}`
    : "Add member";

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit(onFormSubmit)} style={formStyles.form}>
        <div style={formStyles.field}>
          <label htmlFor="add-member-name" style={formStyles.label}>
            Name *
          </label>
          <input
            id="add-member-name"
            {...nameRegisterRest}
            ref={(el) => {
              nameRegisterRef(el);
              nameInputRef.current = el;
            }}
            placeholder="Full name"
            style={{ ...formStyles.input, ...(errors.name ? formStyles.inputError : {}) }}
          />
          {errors.name && (
            <span style={formStyles.error}>{errors.name.message}</span>
          )}
        </div>
        <div style={formStyles.field}>
          <label htmlFor="add-member-birth" style={formStyles.label}>
            Birth date
          </label>
          <input
            id="add-member-birth"
            type="date"
            {...register("birthDate")}
            style={formStyles.input}
          />
        </div>
        <div style={{ ...formStyles.field, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input
            id="add-member-deceased"
            type="checkbox"
            {...register("deceased")}
            style={{ width: 18, height: 18 }}
          />
          <label htmlFor="add-member-deceased" style={formStyles.label}>
            Deceased
          </label>
        </div>
        {deceased && (
          <div style={formStyles.field}>
            <label htmlFor="add-member-death" style={formStyles.label}>
              Death date
            </label>
            <input
              id="add-member-death"
              type="date"
              {...register("deathDate")}
              style={formStyles.input}
            />
          </div>
        )}
        <div style={formStyles.field}>
          <label htmlFor="add-member-bio" style={formStyles.label}>
            Bio (optional)
          </label>
          <textarea
            id="add-member-bio"
            {...register("bio")}
            placeholder="Short bio"
            rows={3}
            style={formStyles.input}
          />
        </div>
        <div style={formStyles.actions}>
          <button type="button" onClick={handleClose} style={formStyles.cancelBtn}>
            Cancel
          </button>
          <button type="submit" disabled={isPending} style={formStyles.submitBtn}>
            {isPending ? "Adding..." : "Add member"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
