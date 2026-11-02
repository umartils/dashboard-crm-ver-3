import "./rfm-guide.css";

type Segment = {
  name: string; // sama persis dengan nilai rfm_segment, dipakai untuk data-segment (warna badge sama dengan tabel donor)
  description: string;
  criteria: string;
};

// Urutan = urutan pengecekan di segment_label(): donatur masuk ke segmen
// PERTAMA yang cocok dari atas ke bawah. Kalau aturan di rfm.py berubah,
// cukup update array ini.
const SEGMENTS: Segment[] = [
  {
    name: "New Donor",
    description:
      "Donatur baru yang baru saja berdonasi dan belum sering berdonasi. Saat yang tepat untuk menyapa dan berterima kasih agar mereka lanjut berdonasi.",
    criteria: "Donasi terakhir 60 hari lalu atau kurang, dan baru berdonasi 1–2 kali.",
  },
  {
    name: "Champion",
    description:
      "Donatur terbaik: baru saja berdonasi, sering berdonasi, dan total donasinya tinggi. Jaga hubungan baik dan berikan apresiasi.",
    criteria:
      "Donasi terakhir 90 hari lalu atau kurang, sudah berdonasi minimal 5 kali, dan total donasi masuk 40% tertinggi.",
  },
  {
    name: "Loyal",
    description:
      "Donatur setia yang rutin berdonasi dengan nilai cukup baik, tapi belum sekuat Champion. Berpotensi naik menjadi Champion.",
    criteria:
      "Donasi terakhir 120 hari lalu atau kurang, sudah berdonasi minimal 3 kali, dan total donasi masuk 60% tertinggi.",
  },
  {
    name: "Active",
    description:
      "Donatur yang masih berdonasi belakangan ini, tapi frekuensi atau total donasinya belum cukup untuk masuk Loyal atau Champion. Perlu dijaga agar tetap aktif.",
    criteria: "Donasi terakhir 180 hari lalu (sekitar 6 bulan) atau kurang, dan tidak masuk segmen di atasnya.",
  },
  {
    name: "Potential",
    description:
      "Donatur yang sudah beberapa bulan tidak berdonasi, tapi masih punya peluang untuk aktif kembali. Waktu yang pas untuk follow-up atau pengingat.",
    criteria: "Donasi terakhir 181–360 hari lalu (sekitar 6–12 bulan).",
  },
  {
    name: "Passive",
    description:
      "Donatur yang sudah lebih dari satu tahun tidak berdonasi. Butuh upaya reaktivasi khusus, dan peluang kembalinya paling kecil.",
    criteria: "Donasi terakhir lebih dari 360 hari lalu (lebih dari 1 tahun).",
  },
];

const FREQUENCY_SCORES = [
  { range: "1 kali", score: 1 },
  { range: "2 kali", score: 2 },
  { range: "3–4 kali", score: 3 },
  { range: "5–9 kali", score: 4 },
  { range: "10 kali atau lebih", score: 5 },
];

export default function RfmGuidePage() {
  return (
    <div className="donor-page">
      <div className="topbar">
        <div>
          <h1>Panduan RFM &amp; Segmen Donatur</h1>
        </div>
      </div>

      <div className="rfm-guide">
        {/* 1. APA ITU RFM */}
        <section>
          <span className="rfm-pill rfm-pill--blue">Apa itu RFM?</span>
          <p>
            <strong>RFM</strong> adalah metode mengelompokkan donatur berdasarkan tiga indikator utama:
          </p>
          <ul>
            <li>
              <strong>Recency</strong> — seberapa baru donatur terakhir kali berdonasi.
            </li>
            <li>
              <strong>Frequency</strong> — seberapa sering donatur berdonasi.
            </li>
            <li>
              <strong>Monetary</strong> — seberapa besar total dana yang sudah didonasikan.
            </li>
          </ul>
          <p>
            Dari ketiga indikator ini, setiap donatur otomatis dimasukkan ke satu <strong>segmen</strong> supaya
            tim bisa menentukan pendekatan yang tepat: siapa yang perlu diapresiasi, disapa, atau diingatkan
            kembali.
          </p>
        </section>

        {/* 2. CARA PENILAIAN */}
        <section>
          <span className="rfm-pill rfm-pill--dark">Cara Penilaian</span>
          <p>Ketiga indikator dihitung dengan cara yang berbeda:</p>
          <ul>
            <li>
              <strong>Recency</strong> dihitung langsung dalam <strong>hari</strong> sejak donasi terakhir. Makin
              kecil angkanya, makin baru donatur tersebut berdonasi.
            </li>
            <li>
              <strong>Frequency</strong> diberi skor <strong>1–5</strong> berdasarkan jumlah donasi, dengan batas
              tetap seperti tabel di bawah.
            </li>
            <li>
              <strong>Monetary</strong> diberi skor <strong>1–5</strong> dengan membandingkan total donasi
              seorang donatur dengan donatur lain. Semua donatur dibagi menjadi 5 kelompok sama besar: skor 5 untuk
              20% donatur dengan total donasi terbesar, skor 1 untuk 20% terkecil.
            </li>
          </ul>

          <div className="rfm-table-wrap rfm-table-wrap--narrow">
            <table className="rfm-table">
              <thead>
                <tr>
                  <th>Jumlah donasi</th>
                  <th>Skor Frequency</th>
                </tr>
              </thead>
              <tbody>
                {FREQUENCY_SCORES.map((row) => (
                  <tr key={row.score}>
                    <td>{row.range}</td>
                    <td>
                      <strong>{row.score}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="rfm-note">
            Skor Monetary bersifat relatif terhadap donatur lain, sehingga batasnya bisa bergeser setiap kali data
            disinkronkan.
          </p>
        </section>

        {/* 3. REFERENSI SEGMENTASI */}
        <section>
          <span className="rfm-pill rfm-pill--dark">Referensi Segmentasi</span>
          <p>
            Segmen ditentukan lewat aturan yang dicek <strong>berurutan dari atas ke bawah</strong> (sesuai urutan
            tabel di bawah). Donatur akan masuk ke <strong>segmen pertama yang cocok</strong>, dan aturan
            berikutnya tidak dicek lagi.
          </p>

          <div className="rfm-callout">
            <strong>Contoh:</strong> Donatur yang terakhir berdonasi 30 hari lalu, sudah berdonasi 6 kali, dan
            total donasinya termasuk 20% terbesar masuk ke segmen <strong>Champion</strong>. Sedangkan donatur yang
            terakhir berdonasi 14 bulan lalu masuk ke segmen <strong>Passive</strong>.
          </div>
        </section>

        {/* 4. DAFTAR SEGMEN */}
        <section>
          <span className="rfm-pill rfm-pill--yellow">Daftar Segmen</span>
          <p>Definisi tiap segmen, urut dari yang dicek lebih dulu:</p>

          <div className="rfm-table-wrap">
            <table className="rfm-table">
              <thead>
                <tr>
                  <th>Segmen</th>
                  <th>Gambaran</th>
                  <th>Kriteria</th>
                </tr>
              </thead>
              <tbody>
                {SEGMENTS.map((segment) => (
                  <tr key={segment.name}>
                    <td>
                      <span className="segment-badge" data-segment={segment.name}>
                        {segment.name}
                      </span>
                    </td>
                    <td>{segment.description}</td>
                    <td>{segment.criteria}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}