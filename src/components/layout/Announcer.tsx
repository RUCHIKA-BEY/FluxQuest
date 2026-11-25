import { useAnnouncer } from '../../store/announcer';

/** Single polite live region. Key changes force re-announcement of identical messages. */
export function Announcer() {
  const { message, id } = useAnnouncer();
  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      <span key={id}>{message}</span>
    </div>
  );
}
