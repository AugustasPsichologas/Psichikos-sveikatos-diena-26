"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";

type SummaryRow = {
  attempt_id: string;
  student_code: string;
  class_name: string;
  total_score: number;
  completed: boolean;
  finished_at: string | null;
  risk_score: number;
  focus_lost_count: number;
  copy_attempt_count: number;
  right_click_count: number;
  suspicious_fast_count: number;
  suspicious_slow_count: number;
};

type DetailRow = {
  attempt_id: string;
  student_code: string;
  class_name: string;
  display_order: number;
  question_text: string;
  selected_answers: string;
  response_time_ms: number | null;
  is_correct: boolean | null;
  score: number | null;
};

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadResults() {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_results_summary");
    if (error) {
      setMessage(error.message);
      setReady(false);
      setLoading(false);
      return;
    }
    setRows((data ?? []) as SummaryRow[]);
    setMessage("");
    setReady(true);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void loadResults();
      else setLoading(false);
    });
  }, []);

  async function login() {
    setMessage("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    await loadResults();
  }

  async function logout() {
    await supabase.auth.signOut();
    setRows([]);
    setReady(false);
  }

  async function exportExcel() {
    const { data, error } = await supabase.rpc("admin_results_detail");
    if (error) {
      setMessage(error.message);
      return;
    }
    const details = (data ?? []) as DetailRow[];
    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.json_to_sheet(rows.map((row) => ({
      Bandymo_ID: row.attempt_id,
      Kodas: row.student_code,
      Klasė: row.class_name,
      Taškai: row.total_score,
      Baigta: row.completed ? "Taip" : "Ne",
      Baigimo_laikas: row.finished_at,
      Rizikos_balas: row.risk_score,
      Lango_pakeitimai: row.focus_lost_count,
      Kopijavimo_bandymai: row.copy_attempt_count,
      Dešiniojo_pelės_bandymai: row.right_click_count,
      Labai_greiti: row.suspicious_fast_count,
      Labai_lėti: row.suspicious_slow_count,
    })));
    const detailSheet = XLSX.utils.json_to_sheet(details.map((row) => ({
      Bandymo_ID: row.attempt_id,
      Kodas: row.student_code,
      Klasė: row.class_name,
      Klausimo_eilė: row.display_order,
      Klausimas: row.question_text,
      Pasirinkta: row.selected_answers,
      Laikas_ms: row.response_time_ms,
      Teisingas: row.is_correct == null ? "" : row.is_correct ? 1 : 0,
      Taškai: row.score,
    })));
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Suvestinė");
    XLSX.utils.book_append_sheet(workbook, detailSheet, "Atsakymai");
    XLSX.writeFile(workbook, "viktorinos_rezultatai.xlsx");
  }

  if (loading) return <main className="grid min-h-screen place-items-center bg-slate-100"><p>Kraunama...</p></main>;

  if (!ready) {
    return <main className="min-h-screen bg-slate-100 p-6"><section className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow"><h1 className="mb-4 text-2xl font-bold">Administratoriaus prisijungimas</h1><input className="mb-3 w-full rounded border p-3" type="email" placeholder="El. paštas" value={email} onChange={(e) => setEmail(e.target.value)} /><input className="mb-3 w-full rounded border p-3" type="password" placeholder="Slaptažodis" value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" className="w-full rounded bg-blue-600 p-3 text-white" onClick={login}>Prisijungti</button>{message ? <p className="mt-3 text-red-700">{message}</p> : null}</section></main>;
  }

  return <main className="min-h-screen bg-slate-100 p-6"><section className="mx-auto max-w-7xl rounded-2xl bg-white p-6 shadow"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Rezultatų suvestinė</h1><p className="text-sm text-gray-600">Rikiuojama nuo daugiausia taškų.</p></div><div className="flex gap-2"><button type="button" onClick={loadResults} className="rounded border px-4 py-2">Atnaujinti</button><button type="button" onClick={exportExcel} className="rounded bg-green-700 px-4 py-2 text-white">Atsisiųsti Excel</button><button type="button" onClick={logout} className="rounded bg-gray-700 px-4 py-2 text-white">Atsijungti</button></div></div>{message ? <p className="mb-4 rounded bg-red-50 p-3 text-red-700">{message}</p> : null}<div className="overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr>{["Vieta","Kodas","Klasė","Taškai","Baigta","Rizika","Langai","Kopijavimai","Greiti","Lėti"].map((title) => <th key={title} className="border p-2 text-left">{title}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.attempt_id}><td className="border p-2">{index + 1}</td><td className="border p-2">{row.student_code}</td><td className="border p-2">{row.class_name}</td><td className="border p-2 font-semibold">{row.total_score}</td><td className="border p-2">{row.completed ? "Taip" : "Ne"}</td><td className="border p-2">{row.risk_score}</td><td className="border p-2">{row.focus_lost_count}</td><td className="border p-2">{row.copy_attempt_count}</td><td className="border p-2">{row.suspicious_fast_count}</td><td className="border p-2">{row.suspicious_slow_count}</td></tr>)}</tbody></table></div></section></main>;
}
