"use client";

import { useEffect, useState } from "react";
import { DonorSummaryDetail } from "./DonorSummaryDetail";

type DonorSummaryModalProps = {
  donorId: string;
  onClose: () => void;
};

type PaginationData = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

type DonorSummaryData = {
  profile: {
    id_donor: string;
    nama: string;
    no_telp: string | null;
    jumlah_donasi: number;
    total_donasi: number;
    tgl_terakhir: string | null;
    campaign_terakhir: string | null;
  };

  recent_donations: {
    id_transaksi: number;
    tanggal_donasi: string;
    nominal: number;
    program: string | null;
    payment_method: string | null;
    campaign: string | null;
  }[];

  pagination: PaginationData;
};

export function DonorSummaryModal({ donorId, onClose }: DonorSummaryModalProps) {
  const [data, setData] = useState<DonorSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    async function loadDonor() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
        });

        const response = await fetch(
          `/api/backend/donor-summary/${donorId}?${params.toString()}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(`Gagal mengambil detail donatur (${response.status})`);
        }

        const result: DonorSummaryData = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    }

    loadDonor();
  }, [donorId, page, pageSize]);

  // Reset pagination kalau donor berubah
  useEffect(() => {
    setPage(1);
    setPageSize(5);
  }, [donorId]);

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) {
          onClose();
        }
      }}
    >
      <div className="donor-modal">
        <div className="modal-header">
          <div>
            <h2>Detail Donatur</h2>
            {!loading && data?.profile.nama && <div className="muted">{data.profile.nama}</div>}
          </div>

          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {loading && (
          <div className="modal-loading">
            <div className="spinner" />
            <div className="muted">Memuat data donatur...</div>
          </div>
        )}

        {error && <div className="modal-error">{error}</div>}

        {!loading && !error && data && (
          <DonorSummaryDetail
            data={data}
            donorId={donorId}
            page={page}
            total={data.pagination.total}
            totalPages={data.pagination.total_pages}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>
    </div>
  );
}