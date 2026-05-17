'use client';

import SiteHeader from "@/components/site/site-header";
import SiteFooter from "@/components/site/site-footer";
import { useState, useRef, type ChangeEvent, type DragEvent } from "react";

const industries = [
  "Trades / construction",
  "Legal / professional services",
  "Accounting / finance",
  "Manufacturing / distribution",
  "Healthcare / clinical",
  "Real estate / property",
  "Staffing / recruiting",
  "Other",
];

const whatWeNeed = [
  { n: "01", label: "One sample output", desc: "A quote, invoice, report — something your business already produces." },
  { n: "02", label: "A process artifact", desc: "An email thread, a Slack message, a voice note explaining how you do it." },
  { n: "03", label: "A reference data sample", desc: "A spreadsheet of rates, a price list, a registry of clients — whatever you reference." },
];

const whatHappensNext = [
  { n: "01", label: "We read the artifacts", desc: "60 seconds. We tell you what we inferred. You confirm or correct." },
  { n: "02", label: "We propose a workflow", desc: "Plain English. Word doc. You mark it up if you want changes." },
  { n: "03", label: "We ship the simulation", desc: "Your workflow runs against synthetic data including edge cases. You approve." },
  { n: "04", label: "You deploy", desc: "Batch CSV upload to start. API later. Your team operates it." },
];

const ACCEPTED_EXTS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.eml', '.msg', '.txt', '.mp3', '.wav', '.m4a'];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

type FormData = {
  name: string;
  email: string;
  company: string;
  role: string;
  industry: string;
  problem: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

type SubmitStatus = 'idle' | 'submitting' | 'error' | 'success';

type UploadedFile = {
  file: File;
  error?: string;
};

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {};
  if (data.name.trim().length < 2) errors.name = 'Name is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.email = 'Valid email is required';
  if (data.company.trim().length < 2) errors.company = 'Company name is required';
  if (!data.industry) errors.industry = 'Select an industry';
  if (data.problem.trim().length < 20) errors.problem = 'Please describe the work in at least 20 characters';
  return errors;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(file: File): string | undefined {
  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
  if (!ACCEPTED_EXTS.includes(ext)) return `Unsupported type · ${ext}`;
  if (file.size > MAX_FILE_BYTES) return `Too large · ${formatBytes(file.size)}`;
  return undefined;
}

export default function ContactPage() {
  const [data, setData] = useState<FormData>({
    name: '',
    email: '',
    company: '',
    role: '',
    industry: '',
    problem: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
    // Re-validate on change if field has been touched
    if (touched[field]) {
      const nextErrors = validate({ ...data, [field]: value });
      setErrors((prev) => ({ ...prev, [field]: nextErrors[field] }));
    }
  };

  const markTouched = (field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const fieldErrors = validate(data);
    setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
  };

  const addFiles = (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles).map((file) => ({ file, error: validateFile(file) }));
    setFiles((prev) => [...prev, ...arr]);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = ''; // reset so same file can re-add
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const allErrors = validate(data);
    // Mark all touched
    setTouched({
      name: true,
      email: true,
      company: true,
      role: true,
      industry: true,
      problem: true,
    });
    setErrors(allErrors);

    if (Object.keys(allErrors).length > 0) {
      // Scroll to first error
      const firstErrorField = Object.keys(allErrors)[0];
      const el = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement | null;
      el?.focus();
      return;
    }

    // Reject if any file has errors
    if (files.some((f) => f.error)) {
      return;
    }

    setStatus('submitting');

    // Simulate network latency (1.5s)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // For the prototype, always succeed. Error state available via ?error=1 query param at submit time.
    const triggerError = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('error') === '1';
    if (triggerError) {
      setStatus('error');
      return;
    }

    setStatus('success');
  };

  const reset = () => {
    setData({ name: '', email: '', company: '', role: '', industry: '', problem: '' });
    setErrors({});
    setTouched({});
    setFiles([]);
    setStatus('idle');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />

      <main id="main" className="relative">
        {/* Page hero */}
        <section className="relative border-b border-white/10 overflow-hidden">
          <div className="absolute top-0 left-0 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-l-2 border-white/20"></div>
          <div className="absolute top-0 right-0 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-r-2 border-white/20"></div>

          <div className="container mx-auto px-6 lg:px-16 py-20 lg:py-32 max-w-6xl">
            <div className="flex items-center gap-2 mb-6 opacity-60">
              <div className="w-8 h-px bg-white"></div>
              <span className="text-white text-[10px] font-mono tracking-wider">BUILD WORKFLOW</span>
              <div className="flex-1 h-px bg-white"></div>
            </div>

            <h1 className="text-4xl lg:text-7xl font-bold font-mono tracking-wider leading-[1.05] mb-6 lg:mb-8" style={{ letterSpacing: '0.08em' }}>
              TELL US ABOUT
              <span className="block opacity-90 mt-1 lg:mt-2">YOUR BUSINESS</span>
            </h1>

            <p className="text-sm lg:text-lg text-white/70 font-mono leading-relaxed max-w-2xl">
              We don&apos;t need a brief. We need artifacts. Show us what your business already produces
              and we&apos;ll reason backwards to the workflow that makes it.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="container mx-auto px-6 lg:px-16 py-16 lg:py-24 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
            {/* FORM */}
            <div className="lg:col-span-3">
              <div className="flex items-center gap-2 mb-6 opacity-60">
                <div className="w-8 h-px bg-white"></div>
                <span className="text-white text-[10px] font-mono tracking-wider">INTAKE</span>
                <div className="flex-1 h-px bg-white"></div>
              </div>

              {status === 'success' ? (
                <div className="border border-white/30 p-8 lg:p-10" role="status" aria-live="polite">
                  <div className="text-[10px] font-mono tracking-widest text-white/40 mb-3">CONFIRMED</div>
                  <h2 className="text-2xl lg:text-3xl font-mono font-bold mb-4 tracking-wider">
                    INTAKE RECEIVED
                  </h2>
                  <p className="text-sm lg:text-base font-mono text-white/70 leading-relaxed mb-6">
                    We&apos;ll respond within 48 hours with the next step. Usually it&apos;s a 30-minute call
                    where you hand us your artifacts. We take it from there.
                  </p>
                  <button
                    type="button"
                    onClick={reset}
                    className="text-[11px] font-mono text-white/60 tracking-widest hover:text-white focus-visible:text-white transition-colors underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    SUBMIT ANOTHER
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5 lg:space-y-6" noValidate>
                  {/* Network error banner */}
                  {status === 'error' && (
                    <div className="border border-orange-400/60 bg-orange-400/[0.05] p-4 lg:p-5" role="alert">
                      <div className="flex items-start gap-3">
                        <span className="text-orange-400 text-base font-mono leading-none mt-0.5">!</span>
                        <div className="flex-1">
                          <div className="text-[10px] font-mono text-orange-400/80 tracking-widest mb-1">SUBMIT FAILED</div>
                          <p className="text-xs lg:text-sm font-mono text-white/80 leading-relaxed mb-3">
                            Network error. Your data wasn&apos;t sent. Try again, or email us directly at{' '}
                            <a href="mailto:hello@boverse.ai" className="text-white underline underline-offset-4">
                              hello@boverse.ai
                            </a>
                            .
                          </p>
                          <button
                            type="button"
                            onClick={() => setStatus('idle')}
                            className="text-[11px] font-mono text-white tracking-widest underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                          >
                            RETRY →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <FormField
                    label="NAME"
                    name="name"
                    type="text"
                    required
                    value={data.name}
                    error={touched.name ? errors.name : undefined}
                    onChange={(v) => update('name', v)}
                    onBlur={() => markTouched('name')}
                    disabled={status === 'submitting'}
                  />
                  <FormField
                    label="EMAIL"
                    name="email"
                    type="email"
                    required
                    value={data.email}
                    error={touched.email ? errors.email : undefined}
                    onChange={(v) => update('email', v)}
                    onBlur={() => markTouched('email')}
                    disabled={status === 'submitting'}
                  />
                  <FormField
                    label="COMPANY"
                    name="company"
                    type="text"
                    required
                    value={data.company}
                    error={touched.company ? errors.company : undefined}
                    onChange={(v) => update('company', v)}
                    onBlur={() => markTouched('company')}
                    disabled={status === 'submitting'}
                  />
                  <FormField
                    label="YOUR ROLE"
                    name="role"
                    type="text"
                    placeholder="Operations manager, founder, etc."
                    value={data.role}
                    error={touched.role ? errors.role : undefined}
                    onChange={(v) => update('role', v)}
                    onBlur={() => markTouched('role')}
                    disabled={status === 'submitting'}
                  />

                  <div>
                    <label htmlFor="industry-select" className="block text-[10px] font-mono text-white/60 tracking-widest mb-2">
                      INDUSTRY <span className="text-white/80" aria-hidden="true">*</span>
                      <span className="sr-only">required</span>
                    </label>
                    <select
                      id="industry-select"
                      name="industry"
                      required
                      aria-invalid={!!(touched.industry && errors.industry)}
                      aria-describedby={touched.industry && errors.industry ? 'industry-error' : undefined}
                      value={data.industry}
                      onChange={(e) => update('industry', e.target.value)}
                      onBlur={() => markTouched('industry')}
                      disabled={status === 'submitting'}
                      className={`w-full bg-transparent border ${
                        touched.industry && errors.industry ? 'border-orange-400/60' : 'border-white/30'
                      } text-white font-mono text-sm px-3 py-2.5 focus:border-white focus:outline-none focus-visible:ring-1 focus-visible:ring-white transition-colors disabled:opacity-50`}
                    >
                      <option value="" disabled className="bg-black">
                        Select industry...
                      </option>
                      {industries.map((ind) => (
                        <option key={ind} value={ind} className="bg-black">
                          {ind}
                        </option>
                      ))}
                    </select>
                    {touched.industry && errors.industry && (
                      <p id="industry-error" className="text-[11px] font-mono text-orange-400/80 mt-1.5" role="alert">
                        {errors.industry}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="problem-input" className="block text-[10px] font-mono text-white/60 tracking-widest mb-2">
                      WHAT REPETITIVE WORK SHOULD WE AUTOMATE? <span className="text-white/80" aria-hidden="true">*</span>
                      <span className="sr-only">required</span>
                    </label>
                    <textarea
                      id="problem-input"
                      name="problem"
                      required
                      rows={5}
                      placeholder="e.g., We get 20 quote requests a week. Senior estimator does pricing in 3 hours each. He's retiring."
                      aria-invalid={!!(touched.problem && errors.problem)}
                      aria-describedby={touched.problem && errors.problem ? 'problem-error' : undefined}
                      value={data.problem}
                      onChange={(e) => update('problem', e.target.value)}
                      onBlur={() => markTouched('problem')}
                      disabled={status === 'submitting'}
                      className={`w-full bg-transparent border ${
                        touched.problem && errors.problem ? 'border-orange-400/60' : 'border-white/30'
                      } text-white font-mono text-sm px-3 py-2.5 focus:border-white focus:outline-none focus-visible:ring-1 focus-visible:ring-white transition-colors placeholder:text-white/30 resize-none disabled:opacity-50`}
                    />
                    <div className="flex justify-between mt-1.5">
                      {touched.problem && errors.problem ? (
                        <p id="problem-error" className="text-[11px] font-mono text-orange-400/80" role="alert">
                          {errors.problem}
                        </p>
                      ) : (
                        <span />
                      )}
                      <span className="text-[10px] font-mono text-white/30 tracking-widest">
                        {data.problem.length} CHARS
                      </span>
                    </div>
                  </div>

                  {/* File upload */}
                  <div>
                    <label className="block text-[10px] font-mono text-white/60 tracking-widest mb-2">
                      ARTIFACTS <span className="text-white/40">· OPTIONAL</span>
                    </label>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label="Upload artifact files"
                      className={`border border-dashed ${
                        dragActive ? 'border-white bg-white/[0.04]' : 'border-white/30'
                      } px-4 py-6 text-center hover:border-white/50 focus-visible:border-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white transition-colors cursor-pointer`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        name="artifacts"
                        multiple
                        accept={ACCEPTED_EXTS.join(',')}
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                      <div className="text-[11px] font-mono text-white/60 tracking-widest mb-1">
                        DROP SAMPLE QUOTE, EMAIL, SPREADSHEET, OR VOICE NOTE
                      </div>
                      <div className="text-[10px] font-mono text-white/30">
                        PDF · DOC · XLS · EML · TXT · MP3 / WAV / M4A &nbsp;·&nbsp; max 10MB each
                      </div>
                    </div>

                    {/* File list */}
                    {files.length > 0 && (
                      <ul className="mt-3 space-y-1.5" aria-label="Selected files">
                        {files.map((f, i) => (
                          <li key={i} className={`flex items-center gap-3 border ${f.error ? 'border-orange-400/40' : 'border-white/20'} px-3 py-2`}>
                            <span className="text-[10px] font-mono text-white/40 tracking-widest">FILE</span>
                            <span className="text-xs font-mono text-white truncate flex-1">{f.file.name}</span>
                            <span className="text-[10px] font-mono text-white/40 tracking-widest">{formatBytes(f.file.size)}</span>
                            {f.error && (
                              <span className="text-[10px] font-mono text-orange-400/80 tracking-widest">{f.error}</span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeFile(i)}
                              aria-label={`Remove ${f.file.name}`}
                              className="text-white/40 hover:text-white focus-visible:text-white focus-visible:outline-none w-5 h-5 flex items-center justify-center"
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="pt-2 lg:pt-4">
                    <button
                      type="submit"
                      disabled={status === 'submitting'}
                      className="w-full lg:w-auto px-8 py-3 bg-white text-black font-mono text-xs lg:text-sm tracking-widest border border-white hover:bg-transparent hover:text-white focus-visible:bg-transparent focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all duration-200 disabled:opacity-60 disabled:cursor-wait inline-flex items-center justify-center gap-2"
                    >
                      {status === 'submitting' ? (
                        <>
                          <span>SUBMITTING</span>
                          <span className="flex gap-1" aria-hidden="true">
                            <span className="w-1 h-1 bg-current rounded-full animate-pulse"></span>
                            <span className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.15s' }}></span>
                            <span className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></span>
                          </span>
                          <span className="sr-only">Please wait</span>
                        </>
                      ) : (
                        <>SUBMIT · BUILD WORKFLOW →</>
                      )}
                    </button>
                    <div className="text-[10px] font-mono text-white/40 tracking-widest mt-3">
                      WE RESPOND WITHIN 48 HOURS
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* SIDE PANEL */}
            <aside className="lg:col-span-2 space-y-12 lg:space-y-14">
              <div>
                <div className="flex items-center gap-2 mb-6 opacity-60">
                  <div className="w-8 h-px bg-white"></div>
                  <span className="text-white text-[10px] font-mono tracking-wider">WHAT WE NEED</span>
                  <div className="flex-1 h-px bg-white"></div>
                </div>

                <div className="space-y-4 lg:space-y-5">
                  {whatWeNeed.map((item) => (
                    <div key={item.n} className="flex gap-3 lg:gap-4">
                      <div className="text-xl lg:text-2xl font-mono font-bold text-white/30 tracking-wider leading-none mt-0.5">
                        {item.n}
                      </div>
                      <div>
                        <div className="text-xs lg:text-sm font-mono text-white font-bold tracking-widest mb-1">
                          {item.label}
                        </div>
                        <div className="text-[11px] lg:text-xs font-mono text-white/60 leading-relaxed">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-6 opacity-60">
                  <div className="w-8 h-px bg-white"></div>
                  <span className="text-white text-[10px] font-mono tracking-wider">WHAT HAPPENS NEXT</span>
                  <div className="flex-1 h-px bg-white"></div>
                </div>

                <div className="space-y-4 lg:space-y-5">
                  {whatHappensNext.map((item, i) => (
                    <div key={item.n} className="flex gap-3 lg:gap-4 relative">
                      <div className="text-xl lg:text-2xl font-mono font-bold text-white/30 tracking-wider leading-none mt-0.5 shrink-0">
                        {item.n}
                      </div>
                      <div className="pb-2">
                        <div className="text-xs lg:text-sm font-mono text-white font-bold tracking-widest mb-1">
                          {item.label}
                        </div>
                        <div className="text-[11px] lg:text-xs font-mono text-white/60 leading-relaxed">
                          {item.desc}
                        </div>
                      </div>
                      {i < whatHappensNext.length - 1 && (
                        <div className="absolute left-3 lg:left-3.5 top-7 bottom-0 w-px bg-white/10"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/10 pt-8">
                <div className="text-[10px] font-mono text-white/60 tracking-widest mb-3">
                  OR DIRECTLY
                </div>
                <a
                  href="mailto:hello@boverse.ai"
                  className="text-sm lg:text-base font-mono text-white hover:underline focus-visible:underline focus-visible:outline-none underline-offset-4"
                >
                  hello@boverse.ai
                </a>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function FormField({
  label,
  name,
  type,
  required,
  placeholder,
  value,
  error,
  disabled,
  onChange,
  onBlur,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const id = `${name}-input`;
  const errorId = `${name}-error`;
  return (
    <div>
      <label htmlFor={id} className="block text-[10px] font-mono text-white/60 tracking-widest mb-2">
        {label}
        {required && (
          <>
            <span className="ml-1 text-white/80" aria-hidden="true">*</span>
            <span className="sr-only">required</span>
          </>
        )}
      </label>
      <input
        id={id}
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`w-full bg-transparent border ${
          error ? 'border-orange-400/60' : 'border-white/30'
        } text-white font-mono text-sm px-3 py-2.5 focus:border-white focus:outline-none focus-visible:ring-1 focus-visible:ring-white transition-colors placeholder:text-white/30 disabled:opacity-50`}
      />
      {error && (
        <p id={errorId} className="text-[11px] font-mono text-orange-400/80 mt-1.5" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
