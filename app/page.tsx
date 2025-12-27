export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { createTrainer } from "./actions";
import Link from "next/link";

export default async function Home() {
  const trainers = await db.trainer.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <main>
      <h1>PokéTTRPG Team Builder</h1>

      <section style={{ marginTop: 16 }}>
        <h2>Neuer Trainer:</h2>
        <div id="neuertrainer">
       <form
            action={async (formData) => {
              "use server";
              await createTrainer(formData); // egal was createTrainer intern returned – der Wrapper returned void
            }}
          >
          <input name="name" placeholder="Trainer name" />
          <input name="money" type="number" placeholder="Money" defaultValue={0} />
          <textarea name="itemsNote" placeholder="Items (notes)" rows={3} />
          <button type="submit">Trainer erstellen</button>
        </form>
        </div>
      </section>

      <section id="uebersicht">
        <h2>Trainers</h2>
        <ul className="trainerList">
  {trainers.map((t) => (
    <li key={t.id}>
      <Link href={`/trainer/${t.slug}`}>
        <b>{t.name}</b>
      </Link>
    </li>
  ))}
</ul>

      </section>
    </main>
  );
}
