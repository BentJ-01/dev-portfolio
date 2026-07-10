// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for all site content.
// Edit anything here and it flows through every component.
// ─────────────────────────────────────────────────────────────────────────────

export interface NavLink {
  label: string;
  href: string;
}

export interface Skill {
  /** Skill / technology name. */
  name: string;
  /** Self-rated proficiency, 0–100. Drives the indicator bar. */
  level: number;
}

export interface SkillGroup {
  /** Display name of the group (e.g. "Salesforce"). */
  name: string;
  /** Short note on why this group matters / who it speaks to. */
  blurb: string;
  /** Individual skills/technologies, sorted strongest first. */
  items: Skill[];
}

export interface ExperienceItem {
  role: string;
  company: string;
  location: string;
  period: string;
  /** Short paragraphs / bullet points describing the work. */
  highlights: string[];
}

export interface LeadershipItem {
  role: string;
  org: string;
  location: string;
  period: string;
  /** Optional extra detail (e.g. a relevant technical contribution). */
  note?: string;
  link?: string;
  linkLabel?: string;
}

export interface Project {
  title: string;
  description: string;
  /** External link (live site / repo). Use null for "coming soon". */
  link: string | null;
  linkLabel?: string;
  tags: string[];
  /** Marks a not-yet-filled-in card so it can be styled differently. */
  placeholder?: boolean;
  /** Highlights a flagship project for extra visual weight. */
  featured?: boolean;
  /** Renders a phone-mockup screenshot slot inside the detail popup. */
  mockup?: boolean;
  /** Screenshot paths shown in the mockup gallery. Empty/undefined shows the "coming soon" placeholder. */
  screenshots?: string[];
  /** Small image shown on the compact card. Use a banner image when available. Falls back to screenshots[0], then a monogram. */
  thumbnail?: string;
}

export interface Certification {
  name: string;
  issuer: string;
  note: string;
}

export interface EducationItem {
  institution: string;
  location: string;
  programs: { title: string; period: string }[];
}

export interface ContactLink {
  label: string;
  value: string;
  href: string;
  /** Lucide-style key used to pick an inline SVG icon. */
  icon: 'mail' | 'linkedin' | 'github' | 'pin';
  external?: boolean;
}

// ── Site-level meta ──────────────────────────────────────────────────────────

export const site = {
  name: 'Bent Jacobs',
  title: 'Bent Jacobs - Software Developer',
  description:
    'Bent Jacobs - Software Developer specialising in Salesforce (Apex, LWC, Agentforce), full-stack engineering and AI-assisted development. Based in Brussels, BE from September 2026.',
  // Used for Open Graph / canonical. Combined with `base` at render time.
  url: 'https://bentj.be',
  ogImage: 'images/og-image.svg',
  locale: 'en',
  author: 'Bent Jacobs',
};

export const hero = {
  name: 'Bent Jacobs',
  // Covers all three target roles in one line.
  title: 'Software Developer',
  subtitle: 'Salesforce · Full-stack · AI enthusiast',
  tagline:
    'Building and automating on Salesforce, shipping full-stack products, and exploring what AI agents can do.',
  cta: {
    projects: { label: 'View projects', href: '#projects' },
    contact: { label: 'Get in touch', href: '#contact' },
    cv: { label: 'Download CV', href: 'cv/Bent-Jacobs-CV.pdf' },
  },
  // Square-ish portrait shown in the hero. Swap the file at this path to update it.
  photo: 'images/bent.jpg',
  photoAlt: 'Portrait of Bent Jacobs',
};

export const nav: NavLink[] = [
  { label: 'Projects', href: '#projects' },
  { label: 'Experience', href: '#experience' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

// ── About ────────────────────────────────────────────────────────────────────

export const about = {
  heading: 'About',
  paragraphs: [
    'I’m a software developer who enjoys turning rough ideas into useful products.',
    'Most days I work with Salesforce. Outside work, I build web and mobile projects or get out on my road bike with friends.',
  ],
};

// ── Skills ───────────────────────────────────────────────────────────────────

export const skills: SkillGroup[] = [
  {
    name: 'Salesforce',
    blurb: 'My day-to-day platform - from declarative automation to custom Apex.',
    items: [
      { name: 'Flows', level: 87 },
      { name: 'Salesforce CLI / SFDX', level: 74 },
      { name: 'SOQL', level: 71 },
      { name: 'LWC', level: 68 },
      { name: 'Apex', level: 55 },
      { name: 'Visualforce', level: 53 },
      { name: 'Agentforce', level: 47 },
    ],
  },
  {
    name: 'Frontend & Mobile',
    blurb: 'Building interfaces and apps people actually enjoy using.',
    items: [
      { name: 'JavaScript', level: 83 },
      { name: 'HTML', level: 78 },
      { name: 'CSS', level: 76 },
      { name: 'Flutter / Dart', level: 59 },
      { name: 'Astro', level: 58 },
      { name: 'TypeScript', level: 52 },
      { name: 'React / React Native', level: 43 },
    ],
  },
  {
    name: 'Backend & Languages',
    blurb: 'Solid fundamentals for data-heavy, reliable systems.',
    items: [
      { name: 'REST APIs', level: 62 },
      { name: 'Python', level: 44 },
      { name: 'Apex', level: 56 },
      { name: 'SQL', level: 42 },
      { name: 'Java', level: 42 },
    ],
  },
  {
    name: 'Tools & DevOps',
    blurb: 'Version control, delivery pipelines and automation for shipping with confidence.',
    items: [
      { name: 'GitHub', level: 66 },
      { name: 'Azure DevOps', level: 64 },
      { name: 'n8n', level: 46 },
      { name: 'Supabase', level: 46 },
      { name: 'Vercel', level: 46 },
      { name: 'Firebase', level: 68 },
    ],
  },
];

// ── Experience ───────────────────────────────────────────────────────────────

export const experience: ExperienceItem[] = [
  {
    role: 'Salesforce Developer',
    company: 'Ittes',
    location: 'Turnhout',
    period: 'Apr 2025 – present',
    highlights: [
      'Build custom Salesforce solutions with Apex, LWC, Flow and Visualforce, from requirements to deployment.',
      'Connect Salesforce with systems such as Odoo and Business Central through REST APIs and n8n.',
    ],
  },
  {
    role: 'Software Engineer',
    company: 'Organi',
    location: 'Wilrijk',
    period: 'Jun 2024 – Apr 2025',
    highlights: [
      'Maintained and extended a Progress OpenEdge ERP platform used by multiple clients.',
      'Built new modules and client-specific features on top of the shared product.',
    ],
  },
  {
    role: 'Frontend Internship',
    company: 'ScoptVision',
    location: 'Leuven',
    period: 'Mar 2023 – Jun 2023',
    highlights: [
      'Evaluated React Native and Flutter, then delivered the app interface in Flutter.',
    ],
  },
];

export const leadership: LeadershipItem[] = [
  {
    role: 'Organiser',
    org: 'NOKOUT Festival',
    location: 'Vosselaar',
    period: '2025 – present',
    note: 'Started with a few friends from Jeugdhuis De Nok. Preparations began in 2025, with the first edition planned for September 2026 and the aim of making it an annual festival.',
    link: 'https://www.nokout.be',
    linkLabel: 'Visit nokout.be',
  },
  {
    role: 'Head of board',
    org: 'Jeugdhuis De Nok',
    location: 'Vosselaar',
    period: '2020 – 2026',
  },
  {
    role: 'Scouts monitor & webmaster',
    org: 'Don Bosco',
    location: 'Vosselaar',
    period: '2019 – 2024',
    note: 'Maintained and improved the group’s WordPress site over the years, then handed it over in good shape to the next webmaster.',
  },
];

export const leadershipBlurb =
  'Volunteering roles outside of work that sharpened my teamwork, coordination and event-organisation skills.';

// ── Projects ─────────────────────────────────────────────────────────────────

export const projects: Project[] = [
  {
    title: 'NOKOUT Festival',
    description:
      'A free community music festival in Vosselaar, run by a small team out of youth house De Nok and working toward its first edition. I help lead the organisation, and on the tech side I built the website from scratch in plain HTML, CSS and JavaScript and help out with its social media.',
    link: 'https://www.nokout.be',
    linkLabel: 'nokout.be',
    tags: ['HTML', 'CSS', 'JavaScript', 'Social media'],
    thumbnail: 'images/nokout/noimage.png',
  },
    {
    title: 'Flare',
    description:
      'A festival regroup app born from years of attending festivals and losing my friends on the festival ground: create a group, share a 6-character code, and when someone gets lost they hit the FLARE button - it pings the whole crew and opens live location sharing for 15 minutes. No always-on tracking, a dark minimal UI, and built to survive a saturated festival network and a dying battery. Flutter on top of Supabase Realtime, with Google Maps and push notifications.',
    link: 'https://github.com/BentJ-01/flare',
    linkLabel: 'View repo',
    tags: ['Flutter', 'Dart', 'Supabase', 'Google Maps'],
    mockup: true,
    thumbnail: 'images/flare/flarebanner.png',
    screenshots: [
      'images/flare/flare1.png',
      'images/flare/flare2.png',
      'images/flare/flare3.png',
    ],
  },
  {
    title: 'Slipstream',
    description:
      'An adaptive multi-sport training planner for balancing sport with work and a personal life: instead of a rigid 12-week schedule that ties you up, it starts from your actual week - free hours, how you feel, the weather - and continuously rebuilds a realistic plan that adapts to your life, not the other way round. A deterministic Python/FastAPI scheduling engine drives the plan, with two-way Garmin sync, Strava import, Open-Meteo weather rules and an optional Claude layer that parses free-text check-ins, all served to a Flutter app for iOS and Android.',
    link: 'https://github.com/BentJ-01/Slipstream',
    linkLabel: 'View repo',
    tags: ['Python', 'FastAPI', 'Flutter', 'Garmin API', 'Claude API'],
    mockup: true,
    screenshots: [
      'images/slipstream/ss1.png',
      'images/slipstream/ss2.png',
      'images/slipstream/ss3.png',
      'images/slipstream/ss4.png',
    ],
  },
  {
    title: 'Segment Hunter',
    description:
      'A personal Flutter app that tracks Strava segment PRs and flags which ones are close to being beaten - essentially rebuilding a Strava Premium feature for free. Built for personal use, shared with a few friends who ride as well.',
    link: 'https://github.com/BentJ-01/segment-hunter',
    linkLabel: 'View repo',
    tags: ['Flutter', 'Dart', 'Supabase', 'Strava API'],
    mockup: true,
    screenshots: [
      'images/segmenthunter/sh1.png',
      'images/segmenthunter/sh2.png',
      'images/segmenthunter/sh3.png',
    ],
  },
  {
    title: 'NoteTaker',
    description:
      'An internal tool I built at Ittes for Salesforce development meetings: jot down requirements and meeting notes in shorthand per feature while the conversation happens, let Claude expand them into full prose, and assemble everything into standardized documentation with Word export - so the write-up is done minutes after the meeting, not days later.',
    link: 'https://github.com/BentJ-01/notetaker',
    linkLabel: 'View repo',
    tags: ['Next.js', 'TypeScript', 'Supabase', 'Claude API'],
  },
  {
    title: 'This portfolio',
    description:
      'The site you’re looking at - built with Astro and TypeScript, deployed to GitHub Pages with a CI/CD pipeline via GitHub Actions. Fast, accessible and built from clean, typed content.',
    link: 'https://github.com/BentJ-01/dev-portfolio',
    linkLabel: 'View the repo',
    tags: ['Astro', 'TypeScript', 'GitHub Actions'],
  },
  {
    title: 'Tuinarchitectuur Woest',
    description:
      'A clean and simple one-page website for a friend working as a landscape architect - built to his brief and focused on getting him found online. Handled the full build and took care of the SEO so he ranks better in local search results.',
    link: 'https://www.tuinarchitectuurwoest.com',
    linkLabel: 'Visit site',
    tags: ['HTML', 'CSS', 'JavaScript', 'SEO'],
    thumbnail: 'images/woest/woestbanner.png',
  },
];

// ── Certifications ───────────────────────────────────────────────────────────

export const certifications: Certification[] = [
  {
    name: 'Salesforce Agentforce Specialist',
    issuer: 'Salesforce',
    note: 'An AI-agent credential: designing, building and grounding autonomous AI agents on the Salesforce platform.',
  },
];

// ── Education ────────────────────────────────────────────────────────────────

export const education: EducationItem[] = [
  {
    institution: 'UCLL',
    location: 'Leuven',
    programs: [
      { title: 'Graduate-level programming', period: '2021 – 2023' },
      { title: 'Bachelor Applied Computer Science', period: '2020 – 2021' },
    ],
  },
  {
    institution: 'Heilig-Graf',
    location: 'Turnhout',
    programs: [
      { title: 'IT Management', period: '2015 – 2020' },
      { title: 'STEM', period: '2013 – 2015' },
    ],
  },
];

// ── Contact ──────────────────────────────────────────────────────────────────

export const contact = {
  heading: 'Let’s talk',
  intro:
    'Open to software, Salesforce and AI developer roles. The fastest way to reach me is email - I’m happy to chat.',
  location: 'Brussels, BE - from September 2026',
  links: [
    {
      label: 'Email',
      value: 'bentjacobs01@gmail.com',
      href: 'mailto:bentjacobs01@gmail.com',
      icon: 'mail',
    },
    {
      label: 'LinkedIn',
      value: 'linkedin.com/in/bent-jacobs',
      href: 'https://www.linkedin.com/in/bent-jacobs-97b75126b/',
      icon: 'linkedin',
      external: true,
    },
    {
      label: 'GitHub',
      value: 'github.com/BentJ-01',
      href: 'https://github.com/BentJ-01',
      icon: 'github',
      external: true,
    },
    {
      label: 'Location',
      value: 'Brussels, BE - from September 2026',
      href: 'https://www.openstreetmap.org/search?query=Brussels',
      icon: 'pin',
      external: true,
    },
  ] as ContactLink[],
};

export const footer = {
  builtWith: 'Built with Astro & TypeScript. Deployed on GitHub Pages.',
  // psst - there's an easter egg. Konami code. 🚴
};
