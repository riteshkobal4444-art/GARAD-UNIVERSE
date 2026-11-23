import { PROJECT_CONTENT_BY_ID } from './projectContentData';
import type {
  PortalId,
  PortalMetadata,
  WorldExhibitRecord,
} from '../types/universe';

/**
 * Decoupled metadata for the Three Iconic Portals on the Central Island.
 * Keeps titles, subtitles, themes, and routing cleanly separate from 3D geometry.
 */
export const WORLD_PORTALS: PortalMetadata[] = [
  {
    id: 'mission-bharari',
    title: 'MISSION BHARARI',
    subtitle: 'Every Child Deserves a Chance',
    actionLabel: 'ENTER MISSION BHARARI',
    shortTheme: 'Education, School & Reading Opportunities',
    accentHex: '#D85A2A',
    glowHex: '#F7C65E',
    targetScreen: 'school-adventure',
  },
  {
    id: 'abhivyakta',
    title: 'ABHIVYAKTĀ',
    subtitle: 'Where Young Voices Rise',
    actionLabel: 'ENTER ABHIVYAKTĀ',
    shortTheme: 'Public Speaking, Confidence & Creative Expression',
    accentHex: '#C97B23',
    glowHex: '#FAD37A',
    targetScreen: 'abhivyakta-world',
  },
  {
    id: 'sankalp',
    title: 'SANKALP',
    subtitle: 'Stories of Change',
    actionLabel: 'ENTER SANKALP',
    shortTheme: 'Community Participation, Care & Empowerment',
    accentHex: '#1D7465',
    glowHex: '#84DCC8',
    targetScreen: 'sankalp-world',
  },
];

export const WORLD_PORTALS_BY_ID: Record<PortalId, PortalMetadata> = WORLD_PORTALS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<PortalId, PortalMetadata>,
);

const missionBharari = PROJECT_CONTENT_BY_ID['mission-bharari'];
const abhivyakta = PROJECT_CONTENT_BY_ID['abhivyakta'];
const granthalay = PROJECT_CONTENT_BY_ID['garad-granthalay'];
const raincoat = PROJECT_CONTENT_BY_ID['rainy-day-of-dreams'];
const youngVoices = PROJECT_CONTENT_BY_ID['young-voices'];

/**
 * Data-driven physical exhibits inside the Abhivyaktā Amphitheatre World.
 * Uses strictly verified/initial Garad Foundation records — zero invented statistics.
 */
export const ABHIVYAKTA_EXHIBITS: WorldExhibitRecord[] = [
  {
    id: 'abhi-stage-podium',
    world: 'abhivyakta',
    title: 'The Young Voices Stage',
    category: 'Student Elocution & Expression',
    subtitle: 'Where Young Voices Rise',
    summary:
      'Abhivyaktā gives students a warm, encouraging platform to speak aloud, express original ideas, and build lasting stage confidence through elocution, poetry, essay writing, and videography.',
    entries: [
      {
        heading: 'Core Expression Formats',
        details: [
          'Student Speech & Elocution Competitions.',
          'Poetry Activities & Essay Writing.',
          'Student Videography Competitions.',
        ],
      },
      {
        heading: 'Documented Speech Competition Record',
        meta: `${youngVoices.activityDate} · ${youngVoices.location}`,
        details: youngVoices.documentedOutcomes,
        verificationNote: 'Initial Garad Foundation record — additional venue details awaiting verification.',
      },
    ],
  },
  {
    id: 'abhi-event-info',
    world: 'abhivyakta',
    title: 'Abhivyaktā Event Information',
    category: 'Documented Activity Records',
    subtitle: 'Verified Records & Programme Overview',
    summary: abhivyakta.shortIntroduction,
    entries: [
      {
        heading: 'Abhivyaktā 2024 & 2025 Records',
        meta: abhivyakta.activityDate,
        details: abhivyakta.documentedOutcomes,
        verificationNote: 'Exact dates, venues, and participant totals awaiting source verification.',
      },
      {
        heading: 'Speech Competition — Young Voices',
        meta: `${youngVoices.activityDate} · ${youngVoices.location}`,
        details: [
          '60 participating students in total.',
          '30 students from grades 5–7 and 30 students from grades 8–10.',
        ],
      },
    ],
    verificationNote: 'Data-driven record — zero participant numbers or awards invented.',
  },
  {
    id: 'abhi-trophies-certificates',
    world: 'abhivyakta',
    title: 'Honours, Trophies & Certificates',
    category: 'Student Recognition',
    subtitle: 'Encouraging Courage & Participation',
    summary:
      'Every young speaker who steps onto the stage is celebrated for courage, clarity, and preparation. Official winner archives and cheque/prize recognition records connect here once verified.',
    entries: [
      {
        heading: 'Abhivyaktā 2025 Recognition',
        details: [
          'Documented cheque/prize-related recognition activity.',
          'Approved student recipient names and prize specifics will appear only after official verification.',
        ],
        verificationNote: 'No student names or award counts fabricated.',
      },
    ],
  },
  {
    id: 'abhi-photo-gallery',
    world: 'abhivyakta',
    title: 'Abhivyaktā Event Photo Gallery',
    category: 'Documentary Photo Archive',
    subtitle: 'Ready for Verified Event Photographs',
    summary:
      'Dedicated timber gallery frames around the amphitheatre reserve space for authentic Garad Foundation event photographs and approved student expression highlights.',
    entries: [
      {
        heading: 'Speech Competition Stage Photographs',
        meta: `${youngVoices.activityDate} · ${youngVoices.location}`,
        details: ['Stage speakers and audience gathering moments.'],
        photoPlaceholder: 'Photograph awaiting upload',
      },
      {
        heading: 'Abhivyaktā 2024 & 2025 Highlights',
        meta: '2024 & 2025',
        details: ['Creative expression sessions and recognition moments.'],
        photoPlaceholder: 'Photograph awaiting upload',
      },
    ],
    verificationNote: 'Real photographs will populate automatically once linked in projectContentData.',
  },
];

/**
 * Data-driven physical exhibit pavilions inside the Sankalp Community Courtyard.
 * Separates verified Garad Foundation records from clearly marked placeholders awaiting verification.
 */
export const SANKALP_EXHIBITS: WorldExhibitRecord[] = [
  {
    id: 'sankalp-education',
    world: 'sankalp',
    title: 'Education Initiatives',
    category: 'Sankalp Pavilion · Learning',
    subtitle: 'Equipping Schools & Young Readers',
    summary:
      'Community-rooted educational support helping children in rural and tribal Maharashtra stay equipped with school materials and open reading libraries.',
    entries: [
      {
        heading: missionBharari.title,
        meta: missionBharari.activityDate,
        details: missionBharari.documentedOutcomes,
        photoPlaceholder: 'Photograph awaiting upload',
      },
      {
        heading: granthalay.title,
        meta: `${granthalay.activityDate} · ${granthalay.location}`,
        details: granthalay.documentedOutcomes,
        photoPlaceholder: 'Photograph awaiting upload',
      },
    ],
    verificationNote: 'Reported reach figures remain marked subject to official source verification.',
  },
  {
    id: 'sankalp-women',
    world: 'sankalp',
    title: 'Women Empowerment',
    category: 'Sankalp Pavilion · Livelihood & Agency',
    subtitle: 'Community Participation & Self-Reliance',
    summary:
      'A dedicated pavilion celebrating women’s leadership, skills, and collective community initiatives across partner villages.',
    entries: [
      {
        heading: 'Verified Programme Archive Slot',
        meta: 'Content awaiting verified Garad Foundation records',
        details: [
          'This exhibit is structurally connected to the reusable project data store.',
          'Verified workshops, dates, participant counts, and photographs will appear here once supplied.',
        ],
        photoPlaceholder: 'Photograph awaiting upload',
        verificationNote: 'Placeholder — zero statistics or activities invented.',
      },
    ],
  },
  {
    id: 'sankalp-health',
    world: 'sankalp',
    title: 'Health & Wellbeing',
    category: 'Sankalp Pavilion · Care & Monsoon Safety',
    subtitle: 'Caring for Everyday Student & Community Wellbeing',
    summary:
      'Practical seasonal care and community wellbeing initiatives supporting schoolchildren and families through changing rural seasons.',
    entries: [
      {
        heading: raincoat.title,
        meta: `${raincoat.activityDate} · ${raincoat.location}`,
        details: raincoat.documentedOutcomes,
        photoPlaceholder: 'Photograph awaiting upload',
      },
      {
        heading: 'Community Health Initiatives',
        meta: 'Awaiting verified records',
        details: [
          'Additional verified health camps and wellbeing drives will populate directly from project data.',
        ],
        verificationNote: 'No unverified camp counts or medical figures fabricated.',
      },
    ],
  },
  {
    id: 'sankalp-sports',
    world: 'sankalp',
    title: 'Sports & Youth Activities',
    category: 'Sankalp Pavilion · Youth Confidence',
    subtitle: 'Teamwork, Voice & Leadership',
    summary:
      'Supporting young people to build confidence, teamwork, and healthy active habits through stage competitions, creative forums, and village youth activities.',
    entries: [
      {
        heading: youngVoices.title,
        meta: `${youngVoices.activityDate} · ${youngVoices.location}`,
        details: youngVoices.documentedOutcomes,
        photoPlaceholder: 'Photograph awaiting upload',
      },
      {
        heading: 'Youth Sports Archive Slot',
        meta: 'Awaiting verified sports records',
        details: [
          'Ready for verified local tournament dates, teams, and authentic ground photographs.',
        ],
        verificationNote: 'Placeholder — zero tournament figures invented.',
      },
    ],
  },
  {
    id: 'sankalp-celebrations',
    world: 'sankalp',
    title: 'Community Celebrations',
    category: 'Sankalp Pavilion · Together as One Village',
    subtitle: 'Shared Festivals, Gatherings & Cultural Pride',
    summary:
      'Moments where families, teachers, students, and volunteers gather in the courtyard to celebrate milestones, harvests, and shared community dreams.',
    entries: [
      {
        heading: 'Community Gathering Archive Slot',
        meta: 'Awaiting verified Garad Foundation event logs',
        details: [
          'Structured exhibit ready for verified festival dates, community stories, and real photographs.',
        ],
        photoPlaceholder: 'Photograph awaiting upload',
        verificationNote: 'Placeholder — awaiting official source documentation.',
      },
    ],
  },
];

export const ALL_WORLD_EXHIBITS_BY_ID: Record<string, WorldExhibitRecord> = [
  ...ABHIVYAKTA_EXHIBITS,
  ...SANKALP_EXHIBITS,
].reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<string, WorldExhibitRecord>,
);
