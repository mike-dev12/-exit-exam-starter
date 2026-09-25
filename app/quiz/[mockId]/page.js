'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function MockQuiz() {
  const [user, setUser] = useState(null);
  const [mock, setMock] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null); // seconds
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const router = useRouter();
  const params = useParams();
  const mockId = params.mockId;

  const intervalRef = useRef(null);
  const stateRef = useRef({ score: 0, questionsLength: 0, user: null, finished: false });

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push('/login');
        return;
      }
      setUser(userData.user);
      stateRef.current.user = userData.user;

      const { data: mockData } = await supabase
        .from('mocks')
        .select('*')
        .eq('id', mockId)
        .single();
      setMock(mockData);

      const { data: qData, error } = await supabase
        .from('questions')
        .select('*')
        .eq('mock_id', mockId);

      if (!error) {
        setQuestions(qData || []);
        stateRef.current.questionsLength = (qData || []).length;
      }

      const minutes = mockData?.duration_minutes ?? 30;
      setTimeLeft(minutes * 60);
    }
    load();
  }, [mockId, router]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || finished) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          handleTimeUp();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft === null, finished]);

  async function handleTimeUp() {
    if (stateRef.current.finished) return;
    stateRef.current.finished = true;
    setAutoSubmitted(true);
    setFinished(true);

    const { user: u } = stateRef.current;
    if (u) {
      await supabase.from('results').insert({
        student_id: u.id,
        mock_id: mockId,
        score: stateRef.current.score,
        total_questions: stateRef.current.questionsLength,
      });
    }
  }

  function handleAnswer(optionKey) {
    if (selected) return;
    setSelected(optionKey);

    const correct = questions[current].correct_option === optionKey;
    if (correct) {
      setScore((s) => {
        const next = s + 1;
        stateRef.current.score = next;
        return next;
      });
    }
  }

  async function handleNext() {
    if (current + 1 < questions.length) {
      setCurrent((c) => c + 1);
      setSelected(null);
    } else {
      stateRef.current.finished = true;
      clearInterval(intervalRef.current);
      setFinished(true);
      await supabase.from('results').insert({
        student_id: user.id,
        mock_id: mockId,
        score,
        total_questions: questions.length,
      });
    }
  }

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  if (!user || timeLeft === null) return <div className="container">Loading...</div>;

  if (questions.length === 0) {
    return (
      <div className="container">
        <h1>No questions yet</h1>
        <p className="subtitle">
          Ask your lecturer to add questions to this mock.
        </p>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="container">
        <h1>Quiz Complete</h1>
        {autoSubmitted && (
          <p style={{ color: '#dc2626' }}>Time's up! Your quiz was submitted automatically.</p>
        )}
        <p className="subtitle">
          You scored {score} out of {questions.length}.
        </p>
        <button onClick={() => router.push('/courses')}>
          Back to Courses
        </button>
      </div>
    );
  }

  const q = questions[current];
  const options = ['A', 'B', 'C', 'D'];
  const isWrong = selected && selected !== q.correct_option;
  const timeRunningLow = timeLeft <= 60;

  return (
    <div className="container">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <p className="subtitle" style={{ margin: 0 }}>
          Question {current + 1} of {questions.length}
        </p>
        <span
          style={{
            fontWeight: 'bold',
            color: timeRunningLow ? '#dc2626' : '#1a1a1a',
          }}
        >
          ⏱ {formatTime(timeLeft)}
        </span>
      </div>

      <div className="question-card">
        <p>{q.question_text}</p>
        {options.map((key) => {
          const text = q[`option_${key.toLowerCase()}`];
          if (!text) return null;

          let cls = 'option-btn';
          if (selected) {
            if (key === q.correct_option) cls += ' correct';
            else if (key === selected) cls += ' wrong';
          }

          return (
            <button
              key={key}
              className={cls}
              onClick={() => handleAnswer(key)}
            >
              {key}. {text}
            </button>
          );
        })}

        {isWrong && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              background: '#fff7ed',
              border: '1px solid #fdba74',
              borderRadius: 8,
              fontSize: '0.9rem',
            }}
          >
            <strong>
              Correct answer: {q.correct_option}.{' '}
              {q[`option_${q.correct_option.toLowerCase()}`]}
            </strong>
            {q.explanation && (
              <p style={{ marginTop: 6, marginBottom: 0 }}>
                {q.explanation}
              </p>
            )}
          </div>
        )}
      </div>
      {selected && <button onClick={handleNext}>Next</button>}
    </div>
  );
}
