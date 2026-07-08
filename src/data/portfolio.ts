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
  /** Renders a phone-mockup screenshot slot inside the card. */
  mockup?: boolean;
  /** Screenshot paths shown in the mockup. Empty/undefined shows the "coming soon" placeholder. */
  screenshots?: string[];
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
    'Bent Jacobs - Software Developer specialising in Salesforce (Apex, LWC, Agentforce), full-stack engineering and AI-assisted development. Based in Vosselaar, BE - open to Brussels.',
  // Used for Open Graph / canonical. Combined with `base` at render time.
  url: 'https://bentj-01.github.io/dev-portfolio',
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
    'I turn business needs into clean, reliable software - building and automating on Salesforce, shipping full-stack products, and exploring what AI agents can do.',
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
  { label: 'About', href: '#about' },
  { label: 'Skills', href: '#skills' },
  { label: 'Experience', href: '#experience' },
  { label: 'Projects', href: '#projects' },
  { label: 'Certifications', href: '#certifications' },
  { label: 'Education', href: '#education' },
  { label: 'Contact', href: '#contact' },
];

// ── About ────────────────────────────────────────────────────────────────────

export const about = {
  heading: 'About',
  paragraphs: [
    'I’m a software developer who feels most at home on the frontend (Flutter, React/React Native, plain HTML/CSS/JS), backed by solid backend foundations I picked up during my studies (Java, SQL, Apex, Progress OpenEdge).',
    'Today I build and automate on Salesforce: Lightning Web Components, Apex, Visualforce and Flows, taking projects from analysis right through to deployment alongside a close-knit team and the clients we build for. I enjoy picking up new tools and frameworks, if there’s solid documentation, I’ll figure it out.',
    'I’m genuinely curious about AI - I hold the Salesforce Agentforce Specialist certification (building AI agents) and I lean on AI-assisted development to ship better, faster.',
    'I like the part of the job where a messy business problem turns into a clean, maintainable solution. Away from the keyboard you’ll usually find me out on the road bike, putting in the kilometres on the flat roads of the Kempen.',
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
      { name: 'SQL', level: 42 },
      { name: 'Progress OpenEdge', level: 31 },
    ],
  },
  {
    name: 'Tools & DevOps',
    blurb: 'Version control, delivery pipelines and automation for shipping with confidence.',
    items: [
      { name: 'GitHub', level: 66 },
      { name: 'Azure DevOps', level: 64 },
      { name: 'n8n', level: 46 },
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
      'Gather requirements directly from clients and translate them into Salesforce solutions, deciding together with the team which tools fit best - Apex, LWC, Flows, Visualforce, ...',
      'Build those solutions end-to-end, from analysis through implementation to deployment.',
      'Write custom Apex - invocable methods and triggers - for complex and performance-sensitive cases.',
      'Integrate Salesforce with external systems such as Odoo and Business Central over REST APIs, and orchestrate flows between platforms with n8n.',
      'Work in a small, close-knit team with strong, direct client contact throughout each project.',
    ],
  },
  {
    role: 'Software Engineer',
    company: 'Organi',
    location: 'Wilrijk',
    period: 'Jun 2024 – Apr 2025',
    highlights: [
      'Worked on a custom, in-house ERP system built in Progress OpenEdge that served as the base platform for multiple clients, each with their own customisations on top.',
      'Maintained and extended the shared platform, handling tickets and feature work across the client base.',
      'Built bespoke modules and per-client adjustments on top of the base system as a junior contributor.',
    ],
  },
  {
    role: 'Frontend Internship',
    company: 'ScoptVision',
    location: 'Leuven',
    period: 'Mar 2023 – Jun 2023',
    highlights: [
      'Evaluated frontend frameworks (React / React Native and Flutter) and built the core components.',
      'Delivered the app design in Flutter / Dart.',
    ],
  },
];

export const leadership: LeadershipItem[] = [
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
    featured: true,
  },
  {
    title: 'Slipstream',
    description:
      'An adaptive multi-sport training planner for the hybrid athlete: instead of handing you a rigid 12-week schedule, it starts from your actual week - free hours, how you feel, the weather - and continuously rebuilds a realistic plan around it. A deterministic Python/FastAPI scheduling engine drives the plan, with two-way Garmin sync, Strava import, Open-Meteo weather rules and an optional Claude layer that parses free-text check-ins, all served to a Flutter app for iOS and Android.',
    link: 'https://github.com/BentJ-01/Slipstream',
    linkLabel: 'View repo',
    tags: ['Python', 'FastAPI', 'Flutter', 'Garmin API', 'Claude API'],
    mockup: true,
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
    title: 'Flare',
    description:
      'A festival regroup app born from years of organising and attending festivals: create a group, share a 6-character code, and when someone gets lost they hit the FLARE button - it pings the whole crew and opens live location sharing for 15 minutes. No always-on tracking, a dark minimal UI, and built to survive a saturated festival network and a dying battery. Flutter on top of Supabase Realtime, with Google Maps and push notifications.',
    link: 'https://github.com/BentJ-01/flare',
    linkLabel: 'View repo',
    tags: ['Flutter', 'Dart', 'Supabase', 'Google Maps'],
    mockup: true,
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
  },
  {
    title: 'Segment Hunter',
    description:
      'A personal Flutter app that tracks Strava segment PRs and flags which ones are close to being beaten - essentially rebuilding a Strava Premium feature for free. Built for personal use, shared with a few friends who ride as well.',
    link: 'https://github.com/BentJ-01/segment-hunter',
    linkLabel: 'View repo',
    tags: ['Flutter', 'Dart', 'Supabase', 'Strava API'],
    mockup: true,
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
  location: 'Vosselaar, BE - open to Brussels',
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
      value: 'Vosselaar, BE - open to Brussels',
      href: 'https://www.openstreetmap.org/search?query=Vosselaar',
      icon: 'pin',
      external: true,
    },
  ] as ContactLink[],
};

export const footer = {
  builtWith: 'Built with Astro & TypeScript. Deployed on GitHub Pages.',
  // psst - there's an easter egg. Konami code. 🚴
};
