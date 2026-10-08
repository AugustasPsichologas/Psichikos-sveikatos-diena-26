"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "./lib/supabase";

type StartAttemptResult = { attempt_id: string; resumed: boolean };
const CODE_PATTERN = /^[A-ZĄČĘĖĮŠŲŪŽ]{2}[0-9]{3}$/u;
const CLASS_PATTERN = /^[0-9]{1,2}[A-ZĄČĘĖĮŠŲŪŽ]?$/u;

function normalizeCode(value: string) {
  return value.toLocaleUpperCase("lt-LT").replace(/\s+/g, "").slice(0, 5);
}
function normalizeClass(value: string) {
  return value.toLocaleUpperCase("lt-LT").replace(/\s+/g, "").slice(0, 3);
}
function getDeviceToken() {
  const key = "quiz_device_token";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const token = crypto.randomUUID();
  localStorage.setItem(key, token);
  return token;
}

export default function HomePage() {
  const router = useRouter();
  const [studentCode, setStudentCode] = useState("");
  const [className, setClassName] = useState("");
  const [privacyRead, setPrivacyRead] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function startQuiz() {
    const code = normalizeCode(studentCode);
    const schoolClass = normalizeClass(className);
    if (!CODE_PATTERN.test(code)) { setMessage("Kodas turi būti sudarytas iš dviejų raidžių ir trijų skaitmenų, pavyzdžiui, AP123."); return; }
    if (!CLASS_PATTERN.test(schoolClass)) { setMessage("Įrašykite klasę, pavyzdžiui, 7A."); return; }
    if (!privacyRead) { setMessage("Patvirtinkite, kad susipažinote su privatumo informacija."); return; }

    setSubmitting(true); setMessage("");
    const { data, error } = await supabase.rpc("start_quiz_attempt_v2", {
      p_student_code: code,
      p_class_name: schoolClass,
      p_device_token: getDeviceToken(),
      p_privacy_accepted: true,
    });
    if (error) { setMessage(error.message || "Nepavyko pradėti testo."); setSubmitting(false); return; }
    const result = data as StartAttemptResult | null;
    if (!result?.attempt_id) { setMessage("Nepavyko gauti bandymo numerio."); setSubmitting(false); return; }
    localStorage.setItem("quiz_attempt_id", result.attempt_id);
    router.push(`/quiz?attempt=${encodeURIComponent(result.attempt_id)}`);
  }

  return <main className="min-h-screen bg-slate-100 p-4 sm:p-10">
    <section className="mx-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-lg sm:p-8">
      <h1 className="mb-3 text-3xl font-bold">Psichikos sveikatos diena</h1>
      <div className="mb-5 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm">
        <strong>Kodas</strong> – Tavo vardo pirma raidė, Tavo pavardės pirma raidė ir bet kokie trys skaičiai. Pavyzdžiui: <strong>AP123</strong>.
      </div>
      <div className="space-y-4">
        <label className="block"><span className="mb-1 block text-sm font-medium">Kodas</span><input value={studentCode} onChange={e=>setStudentCode(normalizeCode(e.target.value))} maxLength={5} autoComplete="off" disabled={submitting} placeholder="AP123" className="w-full rounded-xl border p-3" /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Klasė</span><input value={className} onChange={e=>setClassName(normalizeClass(e.target.value))} maxLength={3} autoComplete="off" disabled={submitting} placeholder="7A" className="w-full rounded-xl border p-3" /></label>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm"><p className="font-semibold">Privatumo informacija</p><p className="mt-2">Viktorinai vykdyti bus tvarkomi kodas, klasė, pasirinkti atsakymai, atsakymo trukmė ir techniniai testo sąžiningumo indikatoriai. Duomenys naudojami viktorinai administruoti, rezultatams apskaičiuoti ir galimiems neatitikimams peržiūrėti.</p></div>
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm"><p className="font-semibold">Viktorinos taisyklės ir informacija</p><p className="mt-2">Klausimuose pasirinkite visus teisingus atsakymus. Teisingų atsakymų gali būti vienas, du, trys arba keturi.</p><p className="mt-2">Kuo greičiau pateiksite <strong>teisingą atsakymą arba atsakymus</strong>, tuo daugiau taškų gausite.</p><p className="mt-2 font-semibold">Sėkmės!</p></div>
        <label className="flex gap-3 rounded-xl border p-4"><input type="checkbox" checked={privacyRead} onChange={e=>setPrivacyRead(e.target.checked)} disabled={submitting} className="mt-1"/><span className="text-sm">Susipažinau su aukščiau pateikta privatumo informacija.</span></label>
        {message ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p> : null}
        <button onClick={startQuiz} disabled={submitting} className="w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white disabled:bg-gray-400">{submitting ? "Ruošiamas testas..." : "Pradėti testą"}</button>
      </div>
    </section>
  </main>;
}
