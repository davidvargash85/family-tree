import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Modal from "./Modal";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  birthDate: z.string().optional().or(z.literal("")),
  deathDate: z.string().optional().or(z.literal("")),
  bio: z.string().optional().nullable(),
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

export default function AddMemberModal({ open, onClose, onSubmit, isPending }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", birthDate: "", deathDate: "", bio: "" },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onFormSubmit = (data) => {
    onSubmit({
      name: data.name.trim(),
      birthDate: data.birthDate?.trim() || null,
      deathDate: data.deathDate?.trim() || null,
      bio: data.bio?.trim() || null,
    });
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add member">
      <form onSubmit={handleSubmit(onFormSubmit)} style={formStyles.form}>
        <div style={formStyles.field}>
          <label htmlFor="add-member-name" style={formStyles.label}>
            Name *
          </label>
          <input
            id="add-member-name"
            {...register("name")}
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
