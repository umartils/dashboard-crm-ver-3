"use client";

import { useEffect, useState } from "react";
import { DonorDetail } from "@/components/donorRfm/DonorDetail";

type DonorModalProps = {
  donorId: number;
  onClose: () => void;
};

type PaginationData = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

type DonorData = {
  profile: {
    id_donor: number;
    nama: string;
    hp?: string | null;
    email?: string | null;
    rfm_segment?: string;
    monetary?: number;
    frequency?: number;
  };

  recent_donations: {
    id_transaksi: number;
    tanggal_donasi: string;
    nominal: number;
    program: string | null;
    payment_method: string | null;
  }[];

  pagination: PaginationData;
};

export function DonorModal({ donorId, onClose }: DonorModalProps) {
  const [data, setData] = useState<DonorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5); // BARU: bukan konstanta lagi

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
          `/api/backend/donors/${donorId}?${params.toString()}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(`Gagal mengambil detail donor (${response.status})`);
        }

        const result: DonorData = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    }

    loadDonor();
    // HAPUS: useEffect kedua yang duplikat sudah tidak ada lagi
  }, [donorId, page, pageSize]);

  // Reset pagination kalau donor berubah
  useEffect(() => {
    setPage(1);
    setPageSize(5);
  }, [donorId]);

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1); // reset ke halaman 1 tiap ganti page size
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
            <h2>Detail Donor</h2>
            {!loading && data?.profile.nama && (
              <div className="muted">{data.profile.nama}</div>
            )}
          </div>

          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {loading && (
          <div className="modal-loading">
            <div className="spinner" />
            <div className="muted">Memuat data donor...</div>
          </div>
        )}

        {error && <div className="modal-error">{error}</div>}

        {!loading && !error && data && (
          <DonorDetail
            data={data}
            donorId={donorId}
            page={page}                       // BARU: page asli dari modal
            total={data.pagination.total}
            totalPages={data.pagination.total_pages}
            pageSize={pageSize}                // BARU: dari state modal
            onPageChange={setPage}             // langsung ke state modal
            onPageSizeChange={handlePageSizeChange} // BARU
          />
        )}
      </div>
    </div>
  );
}