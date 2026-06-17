import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { getGifts } from "@/lib/get-gifts";
import { fmtBRL } from "@/lib/fmt";
import { PresentesAdmin } from "./presentes-client";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminPresentesPage() {
  const s = await getAdminSession();
  if (!s) redirect("/admin/login");

  const gifts = await getGifts();
  const hasAirtable = !!process.env.AIRTABLE_API_KEY && !!process.env.AIRTABLE_BASE_ID;

  return (
    <div>
      <header className={styles.pageHeader}>
        <div>
          <p className={`ds-eyebrow ${styles.pageEyebrow}`}>Catálogo</p>
          <h1 className={`ds-h1 ${styles.pageTitle}`}>Presentes</h1>
        </div>
      </header>

      <PresentesAdmin
        initialGifts={gifts.map((g) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          priceCents: g.priceCents,
          limit: g.limit,
          claimed: g.claimed,
          tint: g.tint,
        }))}
        canEdit={hasAirtable}
        fmtPrice={(c) => fmtBRL(c)}
      />
    </div>
  );
}
