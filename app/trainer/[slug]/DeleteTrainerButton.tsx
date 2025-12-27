"use client";

import { deleteTrainer } from "@/app/actions";

export default function DeleteTrainerButton({ trainerSlug }: { trainerSlug: string }) {
  return (
    <form
      action={deleteTrainer}
      onSubmit={(e) => {
        const ok = window.confirm(
          "Really delete this trainer?\n\nThis will also delete ALL Pokémon of the trainer.\nThis cannot be undone."
        );
        if (!ok) e.preventDefault();
      }}
      style={{ marginTop: 24 }}
    >
      <input type="hidden" name="trainerSlug" value={trainerSlug} />
      <button
        type="submit"
        style={{
          border: "1px solid #b00",
          background: "#fff",
          color: "#b00",
          padding: "8px 12px",
          cursor: "pointer",
        }}
      >
        Delete Trainer
      </button>
    </form>
  );
}
