"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUser, generateOtp, validateOtp } from "@/services/auth";

type Step = "phone" | "otp" | "profile";
type Gender = "male" | "female" | "other";

const formatApiDate = (value: string) => {
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
};

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const submitPhone = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await generateOtp(phone);
      setStep("otp");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const updateOtp = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, key: string) => {
    if (key === "Backspace" && !otp[index] && index > 0) inputs.current[index - 1]?.focus();
  };

  const submitOtp = async (event: FormEvent) => {
    event.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Enter all 6 digits of the OTP.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await validateOtp(phone, code);
      if (!response.isNewUser) {
        router.replace("/");
        return;
      }
      setStep("profile");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The OTP could not be verified.");
    } finally {
      setLoading(false);
    }
  };

  const submitProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!fullName.trim()) return setError("Enter your full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter a valid email address.");
    if (!gender) return setError("Select your gender.");
    if (!dob) return setError("Select your date of birth.");

    setError("");
    setLoading(true);
    try {
      await createUser({
        name: fullName.trim(),
        email: email.trim(),
        phone,
        phoneExt: "+91",
        gender,
        dob: formatApiDate(dob),
      });
      router.replace("/");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create your account.");
    } finally {
      setLoading(false);
    }
  };

  const title = step === "phone" ? "Start with your number" : step === "otp" ? "Verify your number" : "Create your profile";
  const subtitle = step === "phone"
    ? "We will send a one-time code to keep your account secure."
    : step === "otp"
      ? `Enter the 6-digit code sent to +91 ${phone}.`
      : "A few details and you are ready to travel with Trickle.";

  return (
    <main className="min-h-screen bg-[#f6f2eb] px-5 py-8 text-[#1b1d1c] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-3 text-xl font-semibold tracking-[-0.03em]">
          <span className="grid size-9 place-items-center rounded-xl bg-[#e85b43] text-lg font-bold text-white">T</span>
          trickle
        </Link>

        <div className="mt-12 grid overflow-hidden rounded-[2rem] bg-[#fbfaf7] shadow-[0_24px_80px_rgba(27,29,28,0.10)] lg:grid-cols-[0.85fr_1.15fr]">
          <section className="bg-[#183b3a] p-8 text-white sm:p-12 lg:p-16">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e7b65c]">Welcome to Trickle</p>
            <h1 className="mt-5 max-w-md text-4xl font-semibold leading-[1.02] tracking-[-0.06em] sm:text-5xl">Move with people already going your way.</h1>
            <p className="mt-6 max-w-sm text-base leading-7 text-[#c5d4ce]">One account connects you to safer parcel handoffs, clearer routes, and journeys that make room for one more thing.</p>
            <div className="mt-12 space-y-5 text-sm text-[#d8e3de]">
              <p><span className="mr-3 text-[#e7b65c]">01</span>Verify your phone</p>
              <p><span className="mr-3 text-[#e7b65c]">02</span>Tell us about yourself</p>
              <p><span className="mr-3 text-[#e7b65c]">03</span>Start making useful matches</p>
            </div>
          </section>

          <section className="min-w-0 p-7 sm:p-12 lg:p-16">
            <div className="mb-10 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e85b43]">{step === "phone" ? "Step 1 of 3" : step === "otp" ? "Step 2 of 3" : "Step 3 of 3"}</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">{title}</h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-[#62645f]">{subtitle}</p>
              </div>
              <Link href="/" className="text-sm font-semibold text-[#62645f] hover:text-[#1b1d1c]">Back</Link>
            </div>

            {error && <div role="alert" className="mb-5 rounded-xl border border-[#e85b43]/30 bg-[#fff0eb] px-4 py-3 text-sm text-[#b33e2c]">{error}</div>}

            {step === "phone" && (
              <form onSubmit={submitPhone} className="space-y-6">
                <label className="block text-sm font-semibold">Phone number
                  <div className="mt-2 flex overflow-hidden rounded-xl border border-[#d7d2c9] bg-white focus-within:border-[#e85b43]">
                    <span className="flex items-center border-r border-[#e8e3da] px-4 text-sm text-[#62645f]">+91</span>
                    <input autoFocus value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} className="min-w-0 flex-1 px-4 py-3.5 text-base outline-none" inputMode="numeric" />
                  </div>
                </label>
                <button disabled={loading} className="w-full rounded-xl bg-[#e85b43] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#cf4935] disabled:cursor-wait disabled:opacity-60">{loading ? "Sending OTP..." : "Send OTP"}</button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={submitOtp} className="space-y-7">
                <div className="grid min-w-0 grid-cols-6 gap-2 sm:gap-3">
                  {otp.map((digit, index) => <input key={index} ref={(element) => { inputs.current[index] = element; }} autoFocus={index === 0} value={digit} onChange={(event) => updateOtp(index, event.target.value)} onKeyDown={(event) => handleOtpKeyDown(index, event.key)} className="h-14 w-full min-w-0 rounded-xl border border-[#d7d2c9] bg-white px-0 text-center text-xl font-semibold outline-none focus:border-[#e85b43]" inputMode="numeric" maxLength={1} aria-label={`OTP digit ${index + 1}`} />)}
                </div>
                <button disabled={loading} className="w-full rounded-xl bg-[#e85b43] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#cf4935] disabled:cursor-wait disabled:opacity-60">{loading ? "Verifying..." : "Verify OTP"}</button>
                <button type="button" disabled={loading} onClick={submitPhone} className="w-full text-sm font-semibold text-[#183b3a] hover:text-[#e85b43]">Resend OTP</button>
              </form>
            )}

            {step === "profile" && (
              <form onSubmit={submitProfile} className="space-y-5">
                <label className="block text-sm font-semibold">Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3.5 font-normal outline-none focus:border-[#e85b43]" autoComplete="name" /></label>
                <label className="block text-sm font-semibold">Email<input value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3.5 font-normal outline-none focus:border-[#e85b43]" type="email" autoComplete="email" /></label>
                <div><p className="text-sm font-semibold">Gender</p><div className="mt-2 grid grid-cols-3 gap-2">{(["male", "female", "other"] as Gender[]).map((option) => <button type="button" key={option} onClick={() => setGender(option)} className={`rounded-xl border px-3 py-3 text-sm capitalize transition ${gender === option ? "border-[#e85b43] bg-[#fff0eb] text-[#b33e2c]" : "border-[#d7d2c9] bg-white text-[#62645f] hover:border-[#e85b43]"}`}>{option}</button>)}</div></div>
                <label className="block text-sm font-semibold">Date of birth<input value={dob} onChange={(event) => setDob(event.target.value)} className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3.5 font-normal outline-none focus:border-[#e85b43]" type="date" max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().slice(0, 10)} /></label>
                <label className="block text-sm font-semibold">Phone number<input value={`+91 ${phone}`} disabled className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-[#f3f0ea] px-4 py-3.5 font-normal text-[#62645f]" /></label>
                <button disabled={loading} className="w-full rounded-xl bg-[#e85b43] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#cf4935] disabled:cursor-wait disabled:opacity-60">{loading ? "Creating profile..." : "Create my profile"}</button>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
