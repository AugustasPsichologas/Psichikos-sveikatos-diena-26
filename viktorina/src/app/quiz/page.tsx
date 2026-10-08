"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type AnswerOption = {
  id: string;
  answer_text: string;
};

type AttemptState = {
  completed: boolean;
  total_score: number;
  answered_count: number;
  total_questions: number;
  question_id?: string;
  question_text?: string;
  answers?: AnswerOption[];
  question_number?: number;
};

type SubmitResult = {
  saved: boolean;
  completed: boolean;
  total_score: number;
  answered_count: number;
};

function getAttemptId(): string {
  const query = new URLSearchParams(window.location.search);
  return (
    query.get("attempt") ??
    window.localStorage.getItem("quiz_attempt_id") ??
    ""
  );
}

function getDeviceToken(): string {
  return window.localStorage.getItem("quiz_device_token") ?? "";
}

export default function QuizPage() {
  const [state, setState] = useState<AttemptState | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadAttempt = useCallback(async () => {
    const attemptId = getAttemptId();
    const deviceToken = getDeviceToken();

    if (!attemptId || !deviceToken) {
      setErrorMessage(
        "Bandymo duomenys nerasti. Grįžkite į pradinį puslapį ir pradėkite testą iš naujo."
      );
      setLoading(false);
      return;
    }

    window.localStorage.setItem("quiz_attempt_id", attemptId);

    const { data, error } = await supabase.rpc("get_attempt_state", {
      p_attempt_id: attemptId,
      p_device_token: deviceToken,
    });

    if (error) {
      console.error(error);
      setErrorMessage(error.message || "Nepavyko įkelti bandymo.");
      setLoading(false);
      return;
    }

    setState(data as AttemptState);
    setSelectedIds([]);
    setErrorMessage("");
    setLoading(false);
  }, []);

  useEffect(() => {
    // ESLint išimtis reikalinga tik pradiniam bandymo įkėlimui.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAttempt();
  }, [loadAttempt]);

  useEffect(() => {
    async function record(eventType: string) {
      const attemptId = getAttemptId();
      const deviceToken = getDeviceToken();
      if (!attemptId || !deviceToken) return;
      await supabase.rpc("record_quiz_event", {
        p_attempt_id: attemptId,
        p_device_token: deviceToken,
        p_event_type: eventType,
      });
    }
    const visibility = () => { if (document.hidden) void record("TAB_HIDDEN"); };
    const blur = () => { void record("FOCUS_LOST"); };
    const copy = () => { void record("COPY_ATTEMPT"); };
    const context = (event: MouseEvent) => { event.preventDefault(); void record("RIGHT_CLICK"); };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", blur);
    document.addEventListener("copy", copy);
    document.addEventListener("contextmenu", context);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", blur);
      document.removeEventListener("copy", copy);
      document.removeEventListener("contextmenu", context);
    };
  }, []);

  function toggleAnswer(answerId: string) {
    if (submitting) return;

    setSelectedIds((currentIds) =>
      currentIds.includes(answerId)
        ? currentIds.filter((id) => id !== answerId)
        : [...currentIds, answerId]
    );
  }

  async function submitAnswer() {
    if (!state?.question_id || selectedIds.length === 0 || submitting) {
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    const attemptId = getAttemptId();
    const deviceToken = getDeviceToken();

    if (!attemptId || !deviceToken) {
      setErrorMessage("Bandymo duomenys nerasti.");
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase.rpc(
      "submit_attempt_answer",
      {
        p_attempt_id: attemptId,
        p_device_token: deviceToken,
        p_question_id: state.question_id,
        p_selected_answer_ids: selectedIds,
      }
    );

    if (error) {
      console.error(error);
      setErrorMessage(error.message || "Nepavyko išsaugoti atsakymo.");
      setSubmitting(false);
      return;
    }

    const result = data as SubmitResult;

    if (result.completed) {
      setState({
        completed: true,
        total_score: result.total_score,
        answered_count: result.answered_count,
        total_questions: state.total_questions,
      });
      setSelectedIds([]);
      setSubmitting(false);
      return;
    }

    setLoading(true);
    setSubmitting(false);
    await loadAttempt();
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
        <p className="text-lg font-semibold">Kraunamas bandymas...</p>
      </main>
    );
  }

  if (errorMessage && !state) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
        <section className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="mb-3 text-2xl font-bold">
            Nepavyko atidaryti testo
          </h1>
          <p className="mb-6 text-red-700">{errorMessage}</p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Grįžti į pradžią
          </Link>
        </section>
      </main>
    );
  }

  if (state?.completed) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
        <section className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="mb-3 text-3xl font-bold">Testas baigtas</h1>
          <p className="text-2xl font-bold text-blue-700">
            Surinkta taškų: {state.total_score}
          </p>
          <p className="mt-4 text-sm text-gray-600">
            Su teisingais atsakymais būsite supažindinti vėliau.
          </p>
        </section>
      </main>
    );
  }

  if (!state?.question_id || !state.question_text || !state.answers) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
        <section className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="mb-3 text-2xl font-bold">Klausimas nerastas</h1>
          <p className="mb-6 text-gray-700">
            Nepavyko gauti dabartinio klausimo duomenų.
          </p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadAttempt();
            }}
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Bandyti dar kartą
          </button>
        </section>
      </main>
    );
  }

  const questionNumber =
  state.question_number ??
  Math.max(1, (state.answered_count ?? 0) + 1);

const answeredCount =
  state.answered_count ??
  Math.max(0, questionNumber - 1);
  const progress = (questionNumber / state.total_questions) * 100;

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-10">
      <section className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-2 flex items-center justify-between text-sm text-gray-500">
          <span>
            Klausimas {questionNumber} iš {state.total_questions}
          </span>
          <span>Atsakyta: {answeredCount}</span>
        </div>

        <div className="mb-7 h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mb-3 text-sm font-semibold text-blue-700">
          Pažymėkite visus tinkamus atsakymus.
        </p>

        <h1 className="mb-7 text-2xl font-bold leading-snug text-gray-900">
          {state.question_text}
        </h1>

        <div className="space-y-3">
          {state.answers.map((answer) => {
            const selected = selectedIds.includes(answer.id);

            return (
              <label
                key={answer.id}
                className={
                  selected
                    ? "block cursor-pointer rounded-xl border border-blue-600 bg-blue-50 p-4"
                    : "block cursor-pointer rounded-xl border border-gray-300 bg-white p-4 hover:border-blue-400"
                }
              >
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={submitting}
                  onChange={() => toggleAnswer(answer.id)}
                  className="mr-3 h-4 w-4"
                />
                <span className="text-gray-900">{answer.answer_text}</span>
              </label>
            );
          })}
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="button"
          onClick={submitAnswer}
          disabled={selectedIds.length === 0 || submitting}
          className="mt-7 w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {submitting
            ? "Išsaugoma..."
            : questionNumber === state.total_questions
              ? "Baigti testą"
              : "Kitas klausimas"}
        </button>

        <p className="mt-4 text-center text-xs text-gray-500">
          Atsakymas išsaugomas automatiškai. Prie ankstesnio klausimo
          grįžti negalima.
        </p>
      </section>
    </main>
  );
}
