import { href } from '../../lib/router';

export function Footer() {
  return (
    <footer className="no-print mt-24 border-t border-espresso-700/70 bg-espresso-900/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm text-oat-300 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold text-oat-50">FluxQuest</p>
          <p className="mt-2">
            The Slow-Motion Magnet: Seeing the Invisible Force. A virtual companion to the Agastya Lazy Tube model. It supports hands-on exploration and doesn't replace it.
          </p>
        </div>
        <div>
          <p className="font-semibold text-oat-100">Honest science</p>
          <p className="mt-2">
            The simulation is an <strong className="text-oat-100">educational approximation</strong>. Trends are physically grounded. Exact times depend on the real magnet,
            tube and alloy. See the <a className="text-sage-300 underline underline-offset-2" href={href('learn', { tab: 'limits' })}>model limitations</a>.
          </p>
        </div>
        <div>
          <p className="font-semibold text-oat-100">Privacy</p>
          <p className="mt-2">No sign-up and no personal data. Your predictions, results and chats are saved only in this browser.</p>
          <p className="mt-2 text-oat-400">Problem statements P021 · P022 · P023</p>
        </div>
      </div>
    </footer>
  );
}
