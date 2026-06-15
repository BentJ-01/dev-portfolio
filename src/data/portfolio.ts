// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for all site content.
// Edit anything here and it flows through every component.
// ─────────────────────────────────────────────────────────────────────────────

export interface NavLink {
  label: string;
  href: string;
}

export interface SkillGroup {
  /** Display name of the group (e.g. "Salesforce"). */
  name: string;
  /** Short note on why this group matters / who it speaks to. */
  blurb: string;
  /** Individual skills/technologies. */
  items: string[];
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
  // Photo placeholder - drop a square-ish portrait here to replace the placeholder.
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
    'I’m a software developer with a full-stack foundation - comfortable across the frontend (Flutter, React/React Native, plain HTML/CSS/JS) and the backend (Java, SQL, Apex, Progress OpenEdge).',
    'Today I build and automate on Salesforce: Lightning Web Components, Apex, Visualforce and Flows, taking projects from analysis right through to deployment alongside a close-knit team and the clients we build for.',
    'I’m genuinely curious about AI - I hold the Salesforce Agentforce Specialist certification (building AI agents) and I lean on AI-assisted development to ship better, faster.',
    'I like the part of the job where a messy business problem turns into a clean, maintainable solution. Away from the keyboard you’ll usually find me out on the road bike, putting in the kilometres on the flat roads of the Kempen.',
  ],
};

// ── Skills ───────────────────────────────────────────────────────────────────

export const skills: SkillGroup[] = [
  {
    name: 'Salesforce',
    blurb: 'My day-to-day platform - from declarative automation to custom Apex.',
    items: ['Apex', 'LWC', 'Visualforce', 'Flows', 'Agentforce'],
  },
  {
    name: 'Backend',
    blurb: 'Solid fundamentals for data-heavy, reliable systems.',
    items: ['Java', 'SQL', 'Apex', 'Progress OpenEdge'],
  },
  {
    name: 'Frontend & Mobile',
    blurb: 'Building interfaces and apps people actually enjoy using.',
    items: ['Flutter / Dart', 'React / React Native', 'HTML', 'CSS', 'JavaScript'],
  },
  {
    name: 'Tools & DevOps',
    blurb: 'Version control and delivery pipelines for shipping with confidence.',
    items: ['Git', 'Azure DevOps'],
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
      'Part of a small, close-knit team delivering tailored Salesforce solutions, involved end-to-end from analysis to deployment.',
      'Build with Lightning Web Components, Apex and Visualforce, and automate processes with Flows.',
      'Write custom Apex - invocable methods and triggers - for complex and performance-sensitive cases.',
      'Strong client-facing role: gathering requirements, advising on best practices and supporting user adoption.',
    ],
  },
  {
    role: 'Software Engineer',
    company: 'Organi',
    location: 'Wilrijk',
    period: 'Jun 2024 – Apr 2025',
    highlights: [
      'Built tailored software for clients in the recycling industry, from design through implementation to maintenance.',
      'Focused on reliability and customer-oriented development, keeping solutions practical and robust.',
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
      'A free community music festival in Vosselaar that I co-founded as one of four driving founders, born out of youth house De Nok. I own the festival’s full online presence - building and maintaining the website and running its social media.',
    link: 'https://www.nokout.be',
    linkLabel: 'nokout.be',
    tags: ['Web', 'Branding', 'Social media'],
    featured: true,
  },
  {
    title: 'This portfolio',
    description:
      'The site you’re looking at - built with Astro and TypeScript, deployed to GitHub Pages with a CI/CD pipeline via GitHub Actions. Fast, accessible and built from clean, typed content.',
    link: 'https://github.com/bentjacobs/dev-portfolio',
    linkLabel: 'View the repo',
    tags: ['Astro', 'TypeScript', 'GitHub Actions'],
  },
  {
    title: 'Your project here',
    description:
      'Placeholder card - swap this out for your next project. Add a title, a short description, a link and a few tags in src/data/portfolio.ts.',
    link: null,
    tags: ['Coming soon'],
    placeholder: true,
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
      href: 'https://www.linkedin.com/in/bent-jacobs',
      icon: 'linkedin',
      external: true,
    },
    {
      label: 'GitHub',
      value: 'github.com/bentjacobs',
      href: 'https://github.com/bentjacobs',
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
