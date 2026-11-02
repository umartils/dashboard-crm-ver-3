"use client";
import { DonorNonColumns } from "./TableColumns";
import DataTable from "../ui/DataTable";
import { DonorNon } from "@/lib/types";

type Props = {
    donors: DonorNon[];
    page: number;
    pageSize: number;
    total: number;
    // querySearch: string;
}

export default function DonorsTable(
    {
       donors,
       page,
       pageSize,
       total,
    //    querySearch
    }:
    Props
) {
    return (
        <>
            <DataTable
                columns={DonorNonColumns}
                rows={donors}
                rowKey={(u) => u.id_donor}
                itemLabel="donor"
                emptyMessage="Data donor tidak ditemukan."
                total={total}
                page={page}
                pageSize={pageSize}
            />
        </>
    )
}