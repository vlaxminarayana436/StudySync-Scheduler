import { useEffect, useState, type FormEvent } from 'react';
import { HiOutlineCalendarDays, HiOutlineClock, HiOutlineSparkles, HiOutlineUserGroup, HiOutlineXMark } from 'react-icons/hi2';
import type { SessionDraft } from '../types';

interface SessionFormProps {
  onClose: () => void;
  onCreate: (draft: SessionDraft) => Promise<void>;
  initialValues?: Partial<SessionDraft>;
}

function localDateTimeValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function getDefaultTimes() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start: localDateTimeValue(start), end: localDateTimeValue(end) };
}

const subjects = ['General study', 'Mathematics', 'Computer science', 'Chemistry', 'Biology', 'Physics', 'Writing & humanities', 'Other'];

function initialInputValue(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : localDateTimeValue(date);
}

const SessionForm: React.FC<SessionFormProps> = ({ onClose, onCreate, initialValues }) => {
  const defaults = getDefaultTimes();
  const [sessionName, setSessionName] = useState(initialValues?.sessionName || '');
  const [subject, setSubject] = useState(initialValues?.subject || subjects[0]);
  const [description, setDescription] = useState(initialValues?.description || '');
  const [start, setStart] = useState(initialInputValue(initialValues?.start, defaults.start));
  const [end, setEnd] = useState(initialInputValue(initialValues?.end, defaults.end));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, submitting]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!sessionName.trim()) {
      setError('Give your session a name so people know what it’s about.');
      return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setError('Please choose a valid start and end time.');
      return;
    }
    if (startDate.getTime() <= Date.now()) {
      setError('Choose a start time in the future.');
      return;
    }
    if (endDate.getTime() <= startDate.getTime()) {
      setError('The end time needs to be after the start time.');
      return;
    }

    setSubmitting(true);
    try {
      await onCreate({
        sessionName: sessionName.trim(),
        subject,
        description: description.trim(),
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        ...(initialValues?.groupId ? { groupId: initialValues.groupId } : {}),
        ...(initialValues?.groupName ? { groupName: initialValues.groupName } : {}),
        ...(initialValues?.matchSelection ? { matchSelection: initialValues.matchSelection } : {}),
      });
      onClose();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'We couldn’t create that session. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="session-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !submitting && onClose()}>
      <section className="session-modal" role="dialog" aria-modal="true" aria-labelledby="session-modal-title">
        <div className="session-modal-topline" />
        <header className="session-modal-header">
          <div>
            <span className="modal-kicker"><HiOutlineSparkles aria-hidden="true" /> LET’S MAKE IT HAPPEN</span>
            <h2 id="session-modal-title">Create a study session</h2>
            <p>Set a time, invite your people, and get in the zone.</p>
          </div>
          <button className="icon-button modal-close" type="button" onClick={onClose} aria-label="Close session form" disabled={submitting}>
            <HiOutlineXMark aria-hidden="true" />
          </button>
        </header>

        {initialValues?.groupName && (
          <div className="form-linked-group"><HiOutlineUserGroup aria-hidden="true" /> Scheduling for <strong>{initialValues.groupName}</strong></div>
        )}

        <form onSubmit={handleSubmit} className="session-form">
          <label className="form-field form-field--full">
            <span>Session name <b>*</b></span>
            <input
              autoFocus
              type="text"
              maxLength={70}
              placeholder="e.g. Calculus midterm review"
              value={sessionName}
              onChange={(event) => setSessionName(event.target.value)}
              required
            />
          </label>

          <label className="form-field form-field--full">
            <span>Subject</span>
            <select value={subject} onChange={(event) => setSubject(event.target.value)}>
              {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className="form-field">
            <span><HiOutlineCalendarDays aria-hidden="true" /> Starts</span>
            <input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} required disabled={Boolean(initialValues?.matchSelection)} />
          </label>
          <label className="form-field">
            <span><HiOutlineClock aria-hidden="true" /> Ends</span>
            <input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} required disabled={Boolean(initialValues?.matchSelection)} />
          </label>

          {initialValues?.matchSelection && <p className="form-match-lock" role="status">Matched times are locked so fairness memory reflects the session you actually schedule.</p>}

          <label className="form-field form-field--full">
            <span>What are you working on? <small>Optional</small></span>
            <textarea
              rows={3}
              maxLength={240}
              placeholder="Add a little context to help people come prepared…"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <span className="character-count">{description.length}/240</span>
          </label>

          {error && <p className="form-alert form-alert--modal" role="alert">{error}</p>}

          <footer className="session-form-footer">
            <span className="form-note"><HiOutlineSparkles aria-hidden="true" /> You can launch a video room when it’s time.</span>
            <div className="form-actions">
              <button className="button button--quiet" type="button" onClick={onClose} disabled={submitting}>Cancel</button>
              <button className="button button--primary" type="submit" disabled={submitting}>
                {submitting ? <span className="button-spinner button-spinner--light" /> : null}
                {submitting ? 'Creating…' : 'Create session'}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
};

export default SessionForm;
