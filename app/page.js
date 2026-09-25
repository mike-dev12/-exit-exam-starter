import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <nav className="nav">
        <span className="wordmark">
          Exit<span>Prep</span>
        </span>
        <Link href="/login" className="nav-link">
          Log in
        </Link>
      </nav>

      <div className="hero">
        <div>
          <h1>Walk into your exit exam like you&rsquo;ve already sat it.</h1>
          <p className="subtitle">
            Practice questions mapped to your course syllabus, scored the
            moment you finish, so you know exactly where you stand before
            results day.
          </p>

          <Link href="/login" className="hero-cta">
            Start practicing
          </Link>
          <Link href="/login" className="hero-secondary">
            Already have an account?
          </Link>

          <div className="stat-row">
            <div>
              <span className="stat-label">Organized by course, not one long question bank</span>
            </div>
            <div>
              <span className="stat-label">Results scored and saved the moment you submit</span>
            </div>
            <div>
              <span className="stat-label">Set by your own lecturers, not generic question banks</span>
            </div>
          </div>
        </div>

        <div className="hero-art">
          <svg width="300" height="300" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="298" height="298" rx="10" fill="#ffffff" stroke="#d9dfd8" />
            <circle cx="150" cy="130" r="78" fill="none" stroke="#d9dfd8" strokeWidth="12" />
            <circle
              cx="150"
              cy="130"
              r="78"
              fill="none"
              stroke="#0e6b5c"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray="490"
              strokeDashoffset="98"
              transform="rotate(-90 150 130)"
            />
            <text x="150" y="122" textAnchor="middle" fontSize="34" fontWeight="600" fill="#16211d" fontFamily="Georgia, serif">
              80%
            </text>
            <text x="150" y="146" textAnchor="middle" fontSize="12" fill="#5b6b62" fontFamily="sans-serif">
              exam readiness
            </text>

            <rect x="30" y="238" width="82" height="26" rx="13" fill="#e1f3e7" />
            <text x="71" y="255" textAnchor="middle" fontSize="11" fill="#1a4a2e" fontFamily="sans-serif">
              Anatomy
            </text>

            <rect x="120" y="238" width="96" height="26" rx="13" fill="#fbeae7" />
            <text x="168" y="255" textAnchor="middle" fontSize="11" fill="#7a2a20" fontFamily="sans-serif">
              Pharmacology
            </text>

            <rect x="224" y="238" width="46" height="26" rx="13" fill="#eef1ec" />
            <circle cx="238" cy="251" r="4" fill="#c1652b" />
            <text x="252" y="255" textAnchor="middle" fontSize="11" fill="#5b6b62" fontFamily="sans-serif">
              +3
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
