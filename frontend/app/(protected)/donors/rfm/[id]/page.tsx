import { serverApi } from "@/lib/server-api";
import { rupiah } from "@/lib/api";
export default async function DonorDetail({params}:{params:Promise<{id:string}>}){
    const {id} = await params;
    const d=await serverApi<any>(`donors/${id}`);
    const p=d.profile;
    
    return <><div className="topbar"><div><h1>{p.nama}</h1><div className="muted">{p.hp} · {p.email||"email tidak tersedia"}</div></div><span className="badge">{p.rfm_segment}</span></div><div className="detail-grid">{[["Total Donasi",rupiah(Number(p.monetary))],["Frekuensi",`${p.frequency}x`],["Recency",`${p.recency_days} hari`],["Min Donasi",rupiah(Number(p.min_donation||0))],["Median Donasi",rupiah(Number(p.median_donation||0))],["Max Donasi",rupiah(Number(p.max_donation||0))],["Donasi Pertama",String(p.first_donation_date||"-")],["Donasi Terakhir",String(p.last_donation_date||"-")],["Program Favorit",p.program_favorit||"-"],["Payment Favorit",p.payment_favorit||"-"],["R/F/M",`${p.recency_score} / ${p.frequency_score} / ${p.monetary_score}`]].map(([a,b])=><div className="card" key={a}><div className="muted">{a}</div><div style={{fontSize:18,fontWeight:800,marginTop:7}}>{b}</div></div>)}</div><div className="table-card"><div style={{padding:16}}><h3>20 Donasi Terakhir</h3></div><table><thead><tr><th>Tanggal</th><th>Nominal</th><th>Program</th><th>Payment Method</th></tr></thead><tbody>{d.recent_donations.map((x:any)=><tr key={x.id_transaksi}><td>{String(x.tanggal_donasi)}</td><td>{rupiah(Number(x.nominal))}</td><td>{x.program||"-"}</td><td>{x.payment_method||"-"}</td></tr>)}</tbody></table></div></>}
