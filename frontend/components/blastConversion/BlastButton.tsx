"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExportButton, SyncButton } from "@/components/ui/ActionButton";

export default function BlastConversionButton() 
  {
  const router = useRouter(); 
  
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  const month = params.get("month");
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    params.set("month", `${month}-01`);
  }
  const queryString = params.toString();

  return (
    <div className="filter-actions">
      <SyncButton endpoint="/api/backend/whatsapp-blast/blast-conversion-sync" />
      <ExportButton endpoint={`/api/backend/whatsapp-blast/export${
          queryString ? `?${queryString}` : ""
        }`}
      />
    </div>
    
  );
}