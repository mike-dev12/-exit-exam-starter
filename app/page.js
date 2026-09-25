import Link from 'next/link';

export default function Home() {
  return (
    <div className="container">
      <h1>Biomedical Exit Exam Prep</h1>
      <p className="subtitle">
        Practice questions and track your progress before the exit exam.
      </p>
      <Link href="/login">
        <button>Get Started</button>
      </Link>
    </div>
  );
}
