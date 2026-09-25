import Link from 'next/link';

const heroFeatures = [
  {
    icon: '📚',
    title: 'Course-based',
    desc: 'Questions organized according to your courses',
  },
  {
    icon: '🔬',
    title: 'Practical & Practice',
    desc: 'Learn concepts and test your knowledge',
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
    icon: '🔬',
    title: 'Practical & Practice',
    desc: 'Strengthen both theoretical knowledge and practical problem-solving skills.',
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
            <Link href="/login" className="hero-cta">
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
