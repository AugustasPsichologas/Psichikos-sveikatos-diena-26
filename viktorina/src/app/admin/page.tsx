"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type SummaryRow = { attempt_id:string; student_code:string; class_name:string; total_score:number; completed:boolean; finished_at:string|null; risk_score:number; focus_lost_count:number; copy_attempt_count:number; right_click_count:number; suspicious_fast_count:number; suspicious_slow_count:number };
type DetailRow = { attempt_id:string; student_code:string; class_name:string; display_order:number; question_text:string; selected_answers:string; response_time_ms:number|null; is_correct:boolean|null; score:number|null };

function downloadCsv(name:string, records:Record<string,unknown>[]) {
  if (!records.length) return;
  const headers=Object.keys(records[0]);
  const esc=(v:unknown)=>`"${String(v??"").replaceAll('"','""')}"`;
  const csv=[headers.map(esc).join(";"),...records.map(r=>headers.map(h=>esc(r[h])).join(";"))].join("\r\n");
  const url=URL.createObjectURL(new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a"); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url);
}

export default function AdminPage(){
 const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [rows,setRows]=useState<SummaryRow[]>([]); const [ready,setReady]=useState(false); const [loading,setLoading]=useState(true); const [message,setMessage]=useState("");
 async function load(){setLoading(true);const {data,error}=await supabase.rpc("admin_results_summary");if(error){setMessage(error.message);setReady(false);setLoading(false);return;}setRows((data??[]) as SummaryRow[]);setMessage("");setReady(true);setLoading(false);}
 useEffect(()=>{void supabase.auth.getSession().then(({data})=>{if(data.session)void load();else setLoading(false);});},[]);
 async function login(){setLoading(true);setMessage("");const {error}=await supabase.auth.signInWithPassword({email,password});if(error){setMessage(error.message);setLoading(false);return;}await load();}
 async function logout(){await supabase.auth.signOut();setReady(false);setRows([]);}
 async function exportResults(){const {data,error}=await supabase.rpc("admin_results_detail");if(error){setMessage(error.message);return;}const details=(data??[]) as DetailRow[];downloadCsv("viktorinos_suvestine.csv",rows.map(r=>({Kodas:r.student_code,Klasė:r.class_name,Taškai:r.total_score,Baigta:r.completed?"Taip":"Ne",Baigimo_laikas:r.finished_at,Rizika:r.risk_score,Langai:r.focus_lost_count,Kopijavimai:r.copy_attempt_count,Dešinys_pelės:r.right_click_count,Greiti:r.suspicious_fast_count,Lėti:r.suspicious_slow_count})));downloadCsv("viktorinos_atsakymai.csv",details.map(r=>({Kodas:r.student_code,Klasė:r.class_name,Klausimo_eilė:r.display_order,Klausimas:r.question_text,Pasirinkta:r.selected_answers,Laikas_ms:r.response_time_ms,Teisingas:r.is_correct==null?"":r.is_correct?1:0,Taškai:r.score})));}
 if(loading)return <main className="grid min-h-screen place-items-center bg-slate-100"><p>Kraunama...</p></main>;
 if(!ready)return <main className="min-h-screen bg-slate-100 p-6"><section className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow"><h1 className="mb-4 text-2xl font-bold">Administratoriaus prisijungimas</h1><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="El. paštas" className="mb-3 w-full rounded border p-3"/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Slaptažodis" className="mb-3 w-full rounded border p-3"/><button onClick={login} className="w-full rounded bg-blue-600 p-3 text-white">Prisijungti</button>{message?<p className="mt-3 text-red-700">{message}</p>:null}</section></main>;
 return <main className="min-h-screen bg-slate-100 p-6"><section className="mx-auto max-w-7xl rounded-2xl bg-white p-6 shadow"><div className="mb-5 flex flex-wrap justify-between gap-3"><h1 className="text-2xl font-bold">Rezultatų suvestinė</h1><div className="flex gap-2"><button onClick={load} className="rounded border px-4 py-2">Atnaujinti</button><button onClick={exportResults} className="rounded bg-green-700 px-4 py-2 text-white">Excel / CSV</button><button onClick={logout} className="rounded bg-gray-700 px-4 py-2 text-white">Atsijungti</button></div></div>{message?<p className="mb-3 text-red-700">{message}</p>:null}<div className="overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr>{["Vieta","Kodas","Klasė","Taškai","Baigta","Rizika"].map(x=><th key={x} className="border p-2 text-left">{x}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r.attempt_id}><td className="border p-2">{i+1}</td><td className="border p-2">{r.student_code}</td><td className="border p-2">{r.class_name}</td><td className="border p-2">{r.total_score}</td><td className="border p-2">{r.completed?"Taip":"Ne"}</td><td className="border p-2">{r.risk_score}</td></tr>)}</tbody></table></div></section></main>;
}
