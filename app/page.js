import Link from 'next/link';

const heroFeatures = [
  {
    icon: '📚',
    title: 'Course-based',
    desc: 'Questions organized according to your courses',
  },
  {
    icon: '⚙️',
    title: 'Biomedical Engineering Focus',
    desc: 'Study medical devices, instrumentation, imaging, signals, and clinical engineering.',
  },
  {
    icon: '📝',
    title: 'Mock Exams',
    desc: 'Practice under realistic exam conditions',
  },
  {
    icon: '📊',
    title: 'Progress Tracking',
    desc: 'See your performance and identify weak areas',
  },
];

const featureCards = [
  {
    icon: '📚',
    title: 'Course-Based Preparation',
    desc: 'Practice questions organized according to your Biomedical Engineering courses.',
  },
  {
    icon: '⚙️',
    title: 'Biomedical Engineering Focus',
    desc: 'Study medical devices, instrumentation, imaging, signals, and clinical engineering.',
  },
  {
    icon: '⏱️',
    title: 'Mock Exams',
    desc: 'Take timed mock examinations and review your performance.',
  },
];

export default function Home() {
  return (
    <div>
      <header>
        <div className="nav reveal reveal-1">
          <div>
            <span className="wordmark">
              Exit<span>Prep</span>
            </span>
            <div className="nav-tagline">
              Biomedical Engineering Exit Exam Preparation
            </div>
          </div>
          <Link href="/login" className="nav-link">
            Log in
          </Link>
        </div>
      </header>

      <div className="hero">
        <div>
          <h1 className="reveal reveal-2">
            Prepare. Practice. Be ready for your exit exam.
          </h1>
          <p className="subtitle reveal reveal-3">
            A focused preparation platform for Biomedical Engineering
            students. Practice course-based questions, review practical
            concepts, take mock exams, and track your progress.
          </p>

          <div className="reveal reveal-4">
            <Link href="/login?mode=signup" className="hero-cta">
              Start Preparing
            </Link>
            <Link href="/login" className="hero-secondary">
              Already have an account? Log in
            </Link>
          </div>
        </div>

        <div className="hero-card reveal reveal-5">
          <h3>Your preparation, organized</h3>
          {heroFeatures.map((f, i) => (
            <div className={`feature-list-item reveal reveal-${6 + i}`} key={f.title}>
              <span className="feature-icon">{f.icon}</span>
              <div>
                <div className="feature-item-title">{f.title}</div>
                <p className="feature-item-desc">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bio-illustration">
        <div className="bio-illustration-inner">
          <svg
            viewBox="0 0 1100 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* ECG waveform */}
            <path
              d="M40,90 L110,90 L120,60 L135,130 L150,40 L165,95 L190,90 L260,90 L270,75 L280,105 L290,90 L320,90"
              stroke="#087f6b"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity="0.65"
            />

            {/* Monitor / device */}
            <rect x="360" y="50" width="90" height="60" rx="6" stroke="#61706b" strokeWidth="1.6" fill="#f5f7f4" />
            <path
              d="M372,80 L385,80 L390,68 L398,92 L405,80 L420,80"
              stroke="#087f6b"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line x1="405" y1="110" x2="405" y2="122" stroke="#61706b" strokeWidth="1.6" />
            <line x1="390" y1="122" x2="420" y2="122" stroke="#61706b" strokeWidth="1.6" strokeLinecap="round" />

            {/* Microscope */}
            <line x1="498" y1="132" x2="562" y2="132" stroke="#61706b" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="530" y1="132" x2="530" y2="95" stroke="#61706b" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="530" y1="95" x2="552" y2="68" stroke="#61706b" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="552" y1="68" x2="552" y2="52" stroke="#61706b" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="512" y1="110" x2="548" y2="110" stroke="#61706b" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="530" cy="110" r="3" fill="#087f6b" opacity="0.7" />

            {/* Circuit / signal trace */}
            <path
              d="M620,90 L680,90 L680,60 L760,60 L760,110 L840,110 L840,75 L920,75 L920,95 L1000,95"
              stroke="#61706b"
              strokeWidth="1.6"
              fill="none"
            />
            <circle cx="680" cy="90" r="3" fill="#61706b" />
            <circle cx="680" cy="60" r="3" fill="#61706b" />
            <circle cx="760" cy="60" r="3" fill="#087f6b" />
            <circle cx="760" cy="110" r="3" fill="#61706b" />
            <circle cx="840" cy="110" r="3" fill="#61706b" />
            <circle cx="840" cy="75" r="3" fill="#087f6b" />
            <circle cx="920" cy="75" r="3" fill="#61706b" />
            <circle cx="920" cy="95" r="3" fill="#61706b" />
          </svg>
        </div>
      </div>

      <section className="features-section">
        <h2>Everything you need to prepare</h2>
        <div className="features-grid">
          {featureCards.map((f) => (
            <div className="feature-card" key={f.title}>
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="built-for">
        <h2>Built for Biomedical Engineering Students</h2>
        <p>
          Prepare with course-specific questions, practical scenarios,
          calculations, image-based questions, and mock examinations
          designed to support your exit exam preparation.
        </p>
      </section>
    </div>
  );
}
