/**
 * Safety screen for Magneto. Shared by browser and server.
 * 'block' = do not answer the request itself; give a safe reply. 'warn' = answer, with a safety note first.
 */
export interface SafetyResult {
  level: 'ok' | 'warn' | 'block';
  category?: 'electricity' | 'heating' | 'cryogenic' | 'weapon' | 'medical' | 'swallow' | 'personal' | 'misuse';
  message?: string;
}

const RULES: { re: RegExp; level: 'warn' | 'block'; category: SafetyResult['category']; message: string }[] = [
  {
    re: /\b(rail ?gun|coil ?gun|gauss ?gun|taser|stun gun|weapon|shoot|launcher)\b/i,
    level: 'block',
    category: 'weapon',
    message: 'I can’t help build launchers or weapons. Strong magnets and high currents can cause serious injuries. I’m happy to explain the physics of magnetic forces and braking instead!',
  },
  {
    re: /\b(mains|wall socket|power socket|plug (it )?in(to)? the wall|220 ?v|230 ?v|240 ?v|110 ?v|high[- ]voltage|transformer|capacitor bank|electrocut\w*)\b/i,
    level: 'block',
    category: 'electricity',
    message: 'Please never connect tubes, coils or magnets to mains electricity or high-voltage sources: it can kill. The Lazy Tube needs **no electricity at all**. The currents are made by the moving magnet itself.',
  },
  {
    re: /\b(blow ?torch|flame|set (it )?on fire|burn|melt|heat (up )?the (tube|pipe|magnet)|boil|oven|stove top)\b/i,
    level: 'block',
    category: 'heating',
    message: 'Please don’t heat tubes or magnets. Hot metal burns, and neodymium magnets permanently lose their magnetism when overheated (and can crack). I can explain *conceptually* how temperature changes conductivity instead.',
  },
  {
    re: /\b(liquid nitrogen|dry ice|cryogen\w*)\b/i,
    level: 'warn',
    category: 'cryogenic',
    message: '⚠️ **Safety:** liquid nitrogen and dry ice cause severe cold burns and can suffocate in closed rooms. They are only for trained adults with proper equipment. Here is the *physics* as a thought experiment:',
  },
  {
    re: /\b(swallow\w*|eat|in (my|your) mouth|nose)\b.*\bmagnet|\bmagnet\w*\b.*\b(swallow\w*|eat|in (my|your) mouth)\b/i,
    level: 'block',
    category: 'swallow',
    message: '🚨 Swallowed magnets are a **medical emergency**. They can join together inside the body. If someone has swallowed a magnet, tell an adult and get medical help immediately. Never put magnets in your mouth.',
  },
  {
    re: /\b(pacemaker|implant|hearing aid|insulin pump|medical device)\b/i,
    level: 'warn',
    category: 'medical',
    message: '⚠️ **Safety:** keep strong magnets well away from pacemakers, implants, hearing aids and other medical devices. If you have one, ask a teacher to handle the magnets.',
  },
  {
    re: /\b(erase|wipe|destroy|break)\b.*\b(phone|card|laptop|hard ?drive|someone)/i,
    level: 'block',
    category: 'misuse',
    message: 'I can’t help with damaging devices or other people’s things. Do keep strong magnets away from phones, cards and laptops to protect *your own* devices!',
  },
];

const PERSONAL = /([\w.+-]+@[\w-]+\.[\w.]+)|(\+?\d[\d\s-]{8,}\d)|\b(my (home )?address is|i live at)\b/i;

export function screen(text: string): SafetyResult {
  for (const r of RULES) if (r.re.test(text)) return { level: r.level, category: r.category, message: r.message };
  if (PERSONAL.test(text)) return { level: 'warn', category: 'personal', message: 'ℹ️ No need to share personal details like emails, phone numbers or addresses. I’ve removed them.' };
  return { level: 'ok' };
}

/** Remove emails / phone numbers before anything leaves the device. */
export function redact(text: string) {
  return text.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email removed]').replace(/\+?\d[\d\s-]{8,}\d/g, '[number removed]');
}

/** Normalise and bound user input. */
export function sanitize(text: string, max = 500) {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}
