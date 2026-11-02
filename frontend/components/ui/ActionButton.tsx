"use client";

import { toast } from "sonner";
import { useState } from "react";
import { RefreshCw, FileSpreadsheet } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getErrorMessage } from "@/lib/api-error";

type SyncProps = {
    endpoint: string;
}

type ExportProps = {
    endpoint: string;
    params?: string;
}

export function SyncButton({endpoint}: SyncProps) {
    const [isSyncing, setIsSyncing] = useState(false);
    const router = useRouter();

    async function handleSync() {
        if (isSyncing) return;

        const toastId = toast.loading("Sinkronisasi data sedang berjalan...");
        try {
        setIsSyncing(true);

        const response = await fetch(
            endpoint,
            {
            method: "POST",
            }
        );

        if (!response.ok) {
            const message = await getErrorMessage(response);
            toast.error("Sinkronisasi gagal", { description: message });
            return;
        }
        toast.success( "Sinkronisasi data berhasil.", 
            { 
            id: toastId, 
            description: "Data donor berhasil diperbarui dari sumber terbaru.", 
            }
        );

        router.refresh();
        } catch (error) {
        console.error( "Sync donor error:", error );
        toast.error( "Sinkronisasi gagal.",
            {
                id: toastId,
                description:
                error instanceof Error
                    ? error.message
                    : "Terjadi kesalahan saat sinkronisasi data.",
            }
        );
        } finally {
        setIsSyncing(false);
        }
    }
    return (
        <button type="button" className="btn-sync" onClick={handleSync} disabled={isSyncing} title="Sinkronisasi data" >
            <RefreshCw
            size={17}
            className={ isSyncing ? "spin" : "" }
            />
            <span>
            {isSyncing ? "Sync..." : "Sync"}
            </span>
        </button>
    )
}

export function ExportButton({endpoint}: ExportProps) {

    return (
        <a className="btn-download" href={endpoint} >
        <FileSpreadsheet size={17} />
        <span>
            Export
        </span>
        </a>
    )
}