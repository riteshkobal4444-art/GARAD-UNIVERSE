import type {
  LivingBookId,
  NoticeboardRecord,
  ProjectContentRecord,
  VerifiedMapLocation,
} from '../types/universe';

/**
 * Reusable, decoupled Garad Foundation Project Content Data Architecture.
 *
 * Adding a new Garad Foundation project later requires only adding an entry to
 * `PROJECT_CONTENT_DATA` (and optional verified map/noticeboard entries) —
 * no changes to the 3D book engine or reading UI are needed.
 *
 * DATA INTEGRITY POLICY:
 * - Only explicitly provided initial Garad Foundation records are published.
 * - Unverified dates, locations, outcomes, student names, or quotes are never invented.
 * - Missing photographs are explicitly marked "Photograph awaiting upload".
 */
export const PROJECT_CONTENT_DATA: ProjectContentRecord[] = [
  {
    id: 'mission-bharari',
    bookNumber: 'BOOK 01',
    title: 'Mission Bharari',
    coverTitle: 'MISSION BHARARI',
    subtitle: 'Education & Learning Opportunities for Children',
    category: 'Education',
    theme: 'Education and learning opportunities for children',
    coverColor: '#1B5B82',
    accentColor: '#E58235',
    spineLabel: 'MISSION BHARARI',
    shelfLocation: 'Library North Shelf · Bay 1',
    activityDate: 'Phase 1: Feb 2021 · Phase 3: 15 June 2025',
    location: 'Partner Rural & Tribal Schools (Exact school list awaiting verification)',
    shortIntroduction:
      'Mission Bharari supports children’s education and everyday school readiness by providing essential school kits and learning materials across multiple phases.',
    description:
      'Through phased school-material support, Mission Bharari helps rural and tribal schoolchildren step into the classroom equipped to learn with dignity and confidence.',
    documentedOutcomes: [
      'Phase 1 — Initiated in February 2021 (detailed beneficiary report awaiting source verification).',
      'Phase 2 — School kits provided for 150 students (subject to source verification).',
      'Phase 3 — 15 June 2025: school materials provided for 150 tribal students (subject to source verification).',
    ],
    verifiedBeneficiaryFigure:
      'Phase 2: 150 students · Phase 3: 150 tribal students (subject to source verification)',
    reportReferences: [
      'Phase 1–3 official field reports: awaiting upload & archival linking.',
    ],
    verificationStatus: 'initial-record-awaiting-verification',
    photos: [
      {
        id: 'mb-phase1',
        caption: 'Mission Bharari — Phase 1 (February 2021)',
        imageUrl: null,
        placeholderLabel: 'Photograph awaiting upload',
        subjectNote: 'Actual Phase 1 distribution photograph to be uploaded from Garad Foundation archive.',
      },
      {
        id: 'mb-phase2',
        caption: 'Mission Bharari — Phase 2 (School kits for 150 students)',
        imageUrl: null,
        placeholderLabel: 'Photograph awaiting upload',
        subjectNote: 'Actual Phase 2 school kit photograph to be uploaded from Garad Foundation archive.',
      },
      {
        id: 'mb-phase3',
        caption: 'Mission Bharari — Phase 3 (15 June 2025 · 150 tribal students)',
        imageUrl: null,
        placeholderLabel: 'Photograph awaiting upload',
        subjectNote: 'Actual Phase 3 distribution photograph to be uploaded from Garad Foundation archive.',
      },
    ],
    pages: [
      {
        pageNumber: 1,
        kind: 'cover',
        kicker: 'GARAD FOUNDATION · BOOK 01',
        title: 'MISSION BHARARI',
        dateLocation: 'Education & Learning Opportunities for Children',
        bodyParagraphs: [
          'Phased educational support and school learning materials for rural and tribal students.',
        ],
        highlights: [
          'Phase 1 — February 2021',
          'Phase 2 — School kits for 150 students',
          'Phase 3 — 15 June 2025 · 150 tribal students',
        ],
        verificationNote: 'Initial Garad Foundation project record · subject to source verification.',
      },
      {
        pageNumber: 2,
        kind: 'content',
        kicker: 'INTRODUCTION',
        title: 'What Mission Bharari Is',
        dateLocation: 'Theme: Education & Learning Opportunities',
        bodyParagraphs: [
          'Mission Bharari is Garad Foundation’s educational support initiative focused on equipping schoolchildren with the essential kits and learning materials they need for everyday study.',
          'Each phase is documented separately on the following pages so dates, school-material support, and verified impact remain clear and transparent.',
        ],
        highlights: [
          'Focus: Primary & school-age learning readiness',
          'Approach: Phased school kit & material support',
        ],
        verificationNote: 'Source reports & full location list awaiting verification.',
      },
      {
        pageNumber: 3,
        kind: 'content',
        kicker: 'PHASE 1 · SEPARATE RECORD',
        title: 'Phase 1 — February 2021',
        dateLocation: 'Date: February 2021 · Location: Awaiting source verification',
        bodyParagraphs: [
          'Mission Bharari began with Phase 1 in February 2021, laying the foundation for Garad Foundation’s ongoing student learning support work.',
          'Additional Phase 1 location details, school names, and beneficiary counts remain unpublished until verified against official source documents.',
        ],
        photo: {
          id: 'mb-phase1',
          caption: 'Mission Bharari Phase 1 — February 2021',
          imageUrl: null,
          placeholderLabel: 'Photograph awaiting upload',
          subjectNote: 'Phase 1 event photograph',
        },
        verificationNote: 'Status: Initial record (Feb 2021) — additional details awaiting verification.',
      },
      {
        pageNumber: 4,
        kind: 'content',
        kicker: 'PHASE 2 · SEPARATE RECORD',
        title: 'Phase 2 — 150 Student Kits',
        dateLocation: 'Date & School Location: Awaiting source verification',
        bodyParagraphs: [
          'In Phase 2 of Mission Bharari, Garad Foundation organised school kits for 150 students to support classroom participation and regular study.',
          'Exact distribution date, school names, and kit item breakdown will be published once matched to official records.',
        ],
        highlights: ['Documented support: School kits for 150 students'],
        photo: {
          id: 'mb-phase2',
          caption: 'Mission Bharari Phase 2 — School kits for 150 students',
          imageUrl: null,
          placeholderLabel: 'Photograph awaiting upload',
          subjectNote: 'Phase 2 school kit photograph',
        },
        verificationNote: 'Status: Reported 150 students — subject to source verification.',
      },
      {
        pageNumber: 5,
        kind: 'content',
        kicker: 'PHASE 3 · SEPARATE RECORD',
        title: 'Phase 3 — 15 June 2025',
        dateLocation: 'Date: 15 June 2025 · Location: Awaiting verified school names',
        bodyParagraphs: [
          'On 15 June 2025, Phase 3 of Mission Bharari provided school materials for 150 tribal students ahead of the academic term.',
          'Only documented details are recorded here; exact village/school names and photographs will be linked directly from Garad Foundation files.',
        ],
        highlights: [
          'Date: 15 June 2025',
          'Documented support: School materials for 150 tribal students',
        ],
        photo: {
          id: 'mb-phase3',
          caption: 'Mission Bharari Phase 3 — 15 June 2025',
          imageUrl: null,
          placeholderLabel: 'Photograph awaiting upload',
          subjectNote: 'Phase 3 distribution photograph',
        },
        verificationNote: 'Status: Initial record (15 June 2025) — subject to source verification.',
      },
      {
        pageNumber: 6,
        kind: 'content',
        kicker: 'OUTCOMES & VERIFICATION',
        title: 'Verified Archive Status',
        dateLocation: 'Garad Foundation Project Library',
        bodyParagraphs: [
          'This book separates Phase 1 (February 2021), Phase 2 (school kits for 150 students), and Phase 3 (15 June 2025, school materials for 150 tribal students) so future reports and real photographs can be attached accurately to each phase.',
        ],
        highlights: [
          'Photographs: 3 phase slots awaiting upload',
          'Official report links: Awaiting archival upload',
          'Unverified details: Intentionally omitted',
        ],
        verificationNote: 'All figures remain marked subject to official Garad Foundation source verification.',
      },
    ],
  },

  {
    id: 'abhivyakta',
    bookNumber: 'BOOK 02',
    title: 'Abhivyaktā',
    coverTitle: 'ABHIVYAKTĀ',
    subtitle: 'Creativity & Self-Expression',
    category: 'Creative Expression',
    theme: 'Creativity and self-expression',
    coverColor: '#A94426',
    accentColor: '#F0B645',
    spineLabel: 'ABHIVYAKTA',
    shelfLocation: 'Library North Shelf · Bay 2',
    activityDate: 'Abhivyaktā 2024 & Abhivyaktā 2025',
    location: 'Location details awaiting source verification',
    shortIntroduction:
      'Abhivyaktā encourages young learners to express their thoughts and imagination through poetry, essay writing, and videography competitions.',
    description:
      'Designed around creativity and self-expression, Abhivyaktā brings students together across poetry activities, essay competitions, and videography competitions.',
    documentedOutcomes: [
      'Abhivyaktā 2024 — Creative expression activities documented.',
      'Abhivyaktā 2025 — Cheque/prize-related recognition activity documented (exact details awaiting source confirmation).',
    ],
    verifiedBeneficiaryFigure: 'Participant counts & approved winners awaiting source verification',
    reportReferences: ['Abhivyaktā 2024 & 2025 competition records: awaiting upload.'],
    verificationStatus: 'initial-record-awaiting-verification',
    photos: [
      {
        id: 'abhi-2024',
        caption: 'Abhivyaktā 2024 — Creative expression activities',
        imageUrl: null,
        placeholderLabel: 'Photograph awaiting upload',
        subjectNote: 'Actual Abhivyaktā 2024 event photograph or approved student entry',
      },
      {
        id: 'abhi-2025',
        caption: 'Abhivyaktā 2025 — Cheque / prize recognition activity',
        imageUrl: null,
        placeholderLabel: 'Photograph awaiting upload',
        subjectNote: 'Actual Abhivyaktā 2025 prize/cheque presentation photograph',
      },
    ],
    pages: [
      {
        pageNumber: 1,
        kind: 'cover',
        kicker: 'GARAD FOUNDATION · BOOK 02',
        title: 'ABHIVYAKTĀ',
        dateLocation: 'Creativity & Self-Expression',
        bodyParagraphs: [
          'Celebrating student voices through poetry, essays, and videography.',
        ],
        highlights: [
          'Poetry Activities',
          'Essay Competitions',
          'Videography Competitions',
        ],
        verificationNote: 'Initial Garad Foundation record · no student names or winners invented.',
      },
      {
        pageNumber: 2,
        kind: 'content',
        kicker: 'INTRODUCTION',
        title: 'What Abhivyaktā Is',
        dateLocation: 'Theme: Creativity & Self-Expression',
        bodyParagraphs: [
          'Abhivyaktā is Garad Foundation’s creative platform inviting students to share original ideas and imagination across multiple expressive forms.',
          'Activities include poetry activities, essay competitions, and videography competitions. Approved student entries will be featured here only after official review and upload.',
        ],
        highlights: [
          'Formats: Poetry · Essay · Videography',
          'Student submissions: Awaiting approved uploads',
        ],
        verificationNote: 'Competition winner names and entries are never fabricated.',
      },
      {
        pageNumber: 3,
        kind: 'content',
        kicker: '2024 ACTIVITY RECORD',
        title: 'Abhivyaktā 2024',
        dateLocation: 'Year: 2024 · Exact dates & venue awaiting source verification',
        bodyParagraphs: [
          'Abhivyaktā 2024 featured creative expression activities encouraging student participation across written and creative formats.',
          'Approved student poems, essays, and event photographs from 2024 have dedicated slots ready once supplied from Garad Foundation archives.',
        ],
        photo: {
          id: 'abhi-2024',
          caption: 'Abhivyaktā 2024 — Creative expression activities',
          imageUrl: null,
          placeholderLabel: 'Photograph awaiting upload',
          subjectNote: 'Abhivyaktā 2024 event photograph',
        },
        verificationNote: 'Status: Initial 2024 record — full competition summary awaiting verification.',
      },
      {
        pageNumber: 4,
        kind: 'content',
        kicker: '2025 ACTIVITY RECORD',
        title: 'Abhivyaktā 2025',
        dateLocation: 'Year: 2025 · Exact prize figures & dates awaiting verification',
        bodyParagraphs: [
          'Abhivyaktā 2025 includes documented cheque/prize-related recognition activity honouring participating creativity.',
          'Exact prize amounts, recipient names, and event dates are intentionally omitted until verified directly from official Garad Foundation documentation.',
        ],
        photo: {
          id: 'abhi-2025',
          caption: 'Abhivyaktā 2025 — Documented prize / cheque activity',
          imageUrl: null,
          placeholderLabel: 'Photograph awaiting upload',
          subjectNote: 'Abhivyaktā 2025 cheque/prize photograph',
        },
        verificationNote: 'Status: Initial 2025 record — exact documented prize details awaiting verification.',
      },
    ],
  },

  {
    id: 'garad-granthalay',
    bookNumber: 'BOOK 03',
    title: 'Garad Granthalay',
    coverTitle: 'GARAD GRANTHALAY',
    subtitle: 'Creating Opportunities to Read & Learn',
    category: 'Libraries & Reading',
    theme: 'Creating opportunities to read and learn',
    coverColor: '#1B6859',
    accentColor: '#E9AA3E',
    spineLabel: 'GARAD GRANTHALAY',
    shelfLocation: 'Library North Shelf · Bay 3',
    activityDate: '21 July 2025',
    location: 'Nutan Vidyalaya, Bahadoli, Palghar',
    shortIntroduction:
      'Garad Granthalay is Garad Foundation’s school library initiative expanding open access to books and independent reading for students.',
    description:
      'Established on 21 July 2025 at Nutan Vidyalaya, Bahadoli, Palghar, Garad Granthalay brings a dedicated reading collection to the school community.',
    documentedOutcomes: [
      'Library initiative recorded at Nutan Vidyalaya, Bahadoli, Palghar on 21 July 2025.',
      'Reported reach: 350+ students (subject to source verification).',
    ],
    verifiedBeneficiaryFigure: 'Reported reach: 350+ students (subject to source verification)',
    reportReferences: ['Nutan Vidyalaya library setup record: awaiting official report attachment.'],
    verificationStatus: 'initial-record-awaiting-verification',
    photos: [
      {
        id: 'gg-setup',
        caption: 'Garad Granthalay — Nutan Vidyalaya, Bahadoli, Palghar (21 July 2025)',
        imageUrl: null,
        placeholderLabel: 'Photograph awaiting upload',
        subjectNote: 'Actual library setup and shelves photograph',
      },
    ],
    pages: [
      {
        pageNumber: 1,
        kind: 'cover',
        kicker: 'GARAD FOUNDATION · BOOK 03',
        title: 'GARAD GRANTHALAY',
        dateLocation: 'Creating Opportunities to Read & Learn',
        bodyParagraphs: [
          'Nutan Vidyalaya, Bahadoli, Palghar · 21 July 2025',
        ],
        highlights: [
          'Location: Nutan Vidyalaya, Bahadoli, Palghar',
          'Date: 21 July 2025',
          'Reported reach: 350+ students',
        ],
        verificationNote: 'Reported reach subject to official source verification.',
      },
      {
        pageNumber: 2,
        kind: 'content',
        kicker: 'INTRODUCTION',
        title: 'The Library Initiative',
        dateLocation: 'Theme: Creating Opportunities to Read & Learn',
        bodyParagraphs: [
          'Garad Granthalay aims to place inviting books directly within reach of students so reading grows naturally beyond everyday classroom textbooks.',
          'By supporting school-based library spaces, children gain quiet moments to explore stories, science, history, and general knowledge at their own pace.',
        ],
        highlights: ['Goal: Accessible school reading spaces for young learners'],
        verificationNote: 'Catalogue details & book inventory awaiting official attachment.',
      },
      {
        pageNumber: 3,
        kind: 'content',
        kicker: 'LIBRARY SETUP & PHOTOGRAPH',
        title: 'Nutan Vidyalaya, Bahadoli',
        dateLocation: '21 July 2025 · Bahadoli, Palghar, Maharashtra',
        bodyParagraphs: [
          'On 21 July 2025, Garad Granthalay was documented at Nutan Vidyalaya in Bahadoli, Palghar.',
          'Specific setup details—such as book titles, rack count, and launch-day photographs—will populate directly once verified source files are uploaded.',
        ],
        photo: {
          id: 'gg-setup',
          caption: 'Nutan Vidyalaya, Bahadoli, Palghar — 21 July 2025',
          imageUrl: null,
          placeholderLabel: 'Photograph awaiting upload',
          subjectNote: 'Actual Garad Granthalay library photograph',
        },
        verificationNote: 'Photograph slot ready for verified launch-day library photos.',
      },
      {
        pageNumber: 4,
        kind: 'content',
        kicker: 'DOCUMENTED REACH',
        title: 'Reported Reach & Status',
        dateLocation: 'Nutan Vidyalaya, Bahadoli, Palghar',
        bodyParagraphs: [
          'The initial Garad Foundation record reports a reach of 350+ students benefiting from the library initiative at Nutan Vidyalaya.',
          'In keeping with strict archive standards, this figure is presented transparently as reported reach subject to source verification.',
        ],
        highlights: [
          'Date: 21 July 2025',
          'Location: Nutan Vidyalaya, Bahadoli, Palghar',
          'Reported reach: 350+ students (subject to source verification)',
        ],
        verificationNote: 'Status: Initial record awaiting official source document link.',
      },
    ],
  },

  {
    id: 'rainy-day-of-dreams',
    bookNumber: 'BOOK 04',
    title: 'A Rainy Day of Dreams',
    coverTitle: 'A RAINY DAY OF DREAMS',
    subtitle: 'Raincoat Distribution for Schoolchildren',
    category: 'Student Care & Welfare',
    theme: 'Raincoat distribution for schoolchildren',
    coverColor: '#2B5E7E',
    accentColor: '#48A999',
    spineLabel: 'RAINY DAY OF DREAMS',
    shelfLocation: 'Library East Shelf · Bay 1',
    activityDate: '17 August 2025',
    location: 'ZP Kendr School, Kev, Vikramgad, Palghar',
    shortIntroduction:
      'A Rainy Day of Dreams documents Garad Foundation’s monsoon raincoat distribution helping schoolchildren travel safely to school during heavy rains.',
    description:
      'Held on 17 August 2025 at ZP Kendr School, Kev, Vikramgad, Palghar, this activity supported schoolchildren with raincoats for the monsoon season.',
    documentedOutcomes: [
      'Raincoat distribution recorded on 17 August 2025 at ZP Kendr School, Kev, Vikramgad, Palghar.',
      'Reported reach: 200 students (subject to source verification).',
    ],
    verifiedBeneficiaryFigure: 'Reported reach: 200 students (subject to source verification)',
    reportReferences: ['Raincoat distribution record (17 Aug 2025): awaiting official attachment.'],
    verificationStatus: 'initial-record-awaiting-verification',
    photos: [
      {
        id: 'rd-kev',
        caption: 'ZP Kendr School, Kev, Vikramgad, Palghar — 17 August 2025',
        imageUrl: null,
        placeholderLabel: 'Photograph awaiting upload',
        subjectNote: 'Actual raincoat distribution photograph from Kev, Vikramgad',
      },
    ],
    pages: [
      {
        pageNumber: 1,
        kind: 'cover',
        kicker: 'GARAD FOUNDATION · BOOK 04',
        title: 'A RAINY DAY OF DREAMS',
        dateLocation: 'Raincoat Distribution for Schoolchildren',
        bodyParagraphs: [
          'ZP Kendr School, Kev, Vikramgad, Palghar · 17 August 2025',
        ],
        highlights: [
          'Date: 17 August 2025',
          'Location: ZP Kendr School, Kev, Vikramgad, Palghar',
          'Reported reach: 200 students',
        ],
        verificationNote: 'Reported reach subject to official source verification.',
      },
      {
        pageNumber: 2,
        kind: 'content',
        kicker: 'INTRODUCTION',
        title: 'Walking to School in the Monsoon',
        dateLocation: 'Theme: Raincoat Distribution for Schoolchildren',
        bodyParagraphs: [
          'Across Palghar and rural Maharashtra, heavy monsoon rainfall can make the daily walk to school difficult for young children.',
          'Garad Foundation’s raincoat distribution supports students directly during the rainy season so weather does not interrupt learning.',
        ],
        highlights: ['Activity focus: Monsoon raincoats for schoolchildren'],
        verificationNote: 'Short documented overview — no unverified anecdotes added.',
      },
      {
        pageNumber: 3,
        kind: 'content',
        kicker: 'ACTIVITY & PHOTOGRAPH',
        title: 'ZP Kendr School, Kev',
        dateLocation: '17 August 2025 · Kev, Vikramgad, Palghar',
        bodyParagraphs: [
          'On 17 August 2025, raincoats were distributed to schoolchildren at ZP Kendr School, Kev, Vikramgad in Palghar district.',
          'Verified event photographs from this distribution day will appear in the frame below once uploaded to the project archive.',
        ],
        photo: {
          id: 'rd-kev',
          caption: 'Raincoat Distribution — ZP Kendr School, Kev, Vikramgad (17 August 2025)',
          imageUrl: null,
          placeholderLabel: 'Photograph awaiting upload',
          subjectNote: 'Actual event photograph from 17 August 2025',
        },
        verificationNote: 'Status: Initial record — authentic photos awaiting upload.',
      },
      {
        pageNumber: 4,
        kind: 'content',
        kicker: 'DOCUMENTED DETAILS',
        title: 'Reported Reach & Record',
        dateLocation: 'Vikramgad, Palghar · 17 August 2025',
        bodyParagraphs: [
          'The documented activity record notes a reported reach of 200 students at ZP Kendr School, Kev, Vikramgad, Palghar.',
          'This count is displayed with its verification status clearly noted while source distribution sheets and photographs are archived.',
        ],
        highlights: [
          'Date: 17 August 2025',
          'School: ZP Kendr School, Kev, Vikramgad, Palghar',
          'Reported reach: 200 students (subject to source verification)',
        ],
        verificationNote: 'Status: Reported reach subject to source verification.',
      },
    ],
  },

  {
    id: 'young-voices',
    bookNumber: 'BOOK 05',
    title: 'Young Voices',
    coverTitle: 'YOUNG VOICES',
    subtitle: 'Student Confidence & Public Speaking',
    category: 'Youth Confidence',
    theme: 'Student confidence and public speaking',
    coverColor: '#6C3F68',
    accentColor: '#EBA63F',
    spineLabel: 'YOUNG VOICES',
    shelfLocation: 'Library East Shelf · Bay 2',
    activityDate: '19 February 2023',
    location: 'Dada Kondke Amphitheatre',
    shortIntroduction:
      'Young Voices documents Garad Foundation’s student speech competition created to build confidence, articulation, and stage courage.',
    description:
      'Held on 19 February 2023 at Dada Kondke Amphitheatre, the speech competition brought 60 students onto the stage across two age groups: 30 students from grades 5–7 and 30 students from grades 8–10.',
    documentedOutcomes: [
      'Speech competition held on 19 February 2023 at Dada Kondke Amphitheatre.',
      '60 participating students: 30 students from grades 5–7 and 30 students from grades 8–10.',
    ],
    verifiedBeneficiaryFigure: '60 students (30 from grades 5–7 · 30 from grades 8–10)',
    reportReferences: ['Speech Competition record (19 Feb 2023): awaiting official report upload.'],
    verificationStatus: 'initial-record-awaiting-verification',
    photos: [
      {
        id: 'yv-stage',
        caption: 'Speech Competition — Dada Kondke Amphitheatre (19 February 2023)',
        imageUrl: null,
        placeholderLabel: 'Photograph awaiting upload',
        subjectNote: 'Actual stage and student speaker photograph from 19 February 2023',
      },
    ],
    pages: [
      {
        pageNumber: 1,
        kind: 'cover',
        kicker: 'GARAD FOUNDATION · BOOK 05',
        title: 'YOUNG VOICES',
        dateLocation: 'Student Confidence & Public Speaking',
        bodyParagraphs: [
          'Speech Competition · 19 February 2023 · Dada Kondke Amphitheatre',
        ],
        highlights: [
          '60 participating students',
          '30 students — Grades 5–7',
          '30 students — Grades 8–10',
        ],
        verificationNote: 'Initial Garad Foundation record · subject to source verification.',
      },
      {
        pageNumber: 2,
        kind: 'content',
        kicker: 'INTRODUCTION',
        title: 'Finding Courage on Stage',
        dateLocation: 'Theme: Student Confidence & Public Speaking',
        bodyParagraphs: [
          'Public speaking helps students organise their ideas, speak clearly in front of peers and elders, and discover lasting self-confidence.',
          'Garad Foundation’s speech competition created an encouraging stage divided fairly between middle-school and secondary-school speakers.',
        ],
        highlights: [
          'Junior Group: Grades 5–7 (30 students)',
          'Senior Group: Grades 8–10 (30 students)',
        ],
        verificationNote: 'No invented speeches, topics, or student names included.',
      },
      {
        pageNumber: 3,
        kind: 'content',
        kicker: 'EVENT RECORD · 19 FEBRUARY 2023',
        title: 'Dada Kondke Amphitheatre',
        dateLocation: '19 February 2023 · Dada Kondke Amphitheatre',
        bodyParagraphs: [
          'On 19 February 2023, 60 students participated in the speech competition held at Dada Kondke Amphitheatre.',
          'Participation was balanced evenly across two divisions: 30 students from grades 5–7 and 30 students from grades 8–10.',
        ],
        highlights: [
          'Date: 19 February 2023',
          'Venue: Dada Kondke Amphitheatre',
          'Total documented participants: 60 students',
        ],
        verificationNote: 'Venue city/district details awaiting official source confirmation.',
      },
      {
        pageNumber: 4,
        kind: 'content',
        kicker: 'PHOTOGRAPHS & HIGHLIGHTS',
        title: 'Event Archive Slot',
        dateLocation: 'Speech Competition · 19 February 2023',
        bodyParagraphs: [
          'Authentic stage photographs and official competition highlights from 19 February 2023 will appear directly here once supplied from Garad Foundation archives.',
        ],
        photo: {
          id: 'yv-stage',
          caption: 'Speech Competition — Dada Kondke Amphitheatre (19 February 2023)',
          imageUrl: null,
          placeholderLabel: 'Photograph awaiting upload',
          subjectNote: 'Actual competition stage photograph',
        },
        verificationNote: 'Status: Documented participant figures shown; photos & highlights awaiting upload.',
      },
    ],
  },
];

export const PROJECT_CONTENT_BY_ID: Record<LivingBookId, ProjectContentRecord> =
  PROJECT_CONTENT_DATA.reduce(
    (acc, project) => {
      acc[project.id] = project;
      return acc;
    },
    {} as Record<LivingBookId, ProjectContentRecord>,
  );

/**
 * Garad Foundation Physical Noticeboard initial records.
 */
export const NOTICEBOARD_RECORDS: NoticeboardRecord[] = [
  {
    id: 'nb-mission-bharari',
    projectId: 'mission-bharari',
    title: 'Mission Bharari',
    category: 'Education',
    accentColor: '#1B5B82',
    entries: [
      'Phase 1 — February 2021.',
      'Phase 2 — School kits for 150 students.',
      'Phase 3 — 15 June 2025, school materials for 150 tribal students.',
    ],
    verificationNote: 'Initial record — subject to source verification; photos awaiting upload.',
  },
  {
    id: 'nb-abhivyakta',
    projectId: 'abhivyakta',
    title: 'Abhivyaktā',
    category: 'Creativity',
    accentColor: '#A94426',
    entries: [
      'Abhivyaktā 2024 — Creative expression activities.',
      'Abhivyaktā 2025 — Documented cheque/prize-related activity.',
    ],
    verificationNote: 'Using documented details only — exact dates & photos awaiting verification.',
  },
  {
    id: 'nb-speech',
    projectId: 'young-voices',
    title: 'Speech Competition (Young Voices)',
    category: 'Public Speaking',
    accentColor: '#6C3F68',
    entries: [
      'Date: 19 February 2023 · Location: Dada Kondke Amphitheatre.',
      '60 students total: 30 students (grades 5–7) and 30 students (grades 8–10).',
    ],
    verificationNote: 'Event photographs awaiting upload.',
  },
  {
    id: 'nb-granthalay',
    projectId: 'garad-granthalay',
    title: 'Garad Granthalay',
    category: 'Library',
    accentColor: '#1B6859',
    entries: [
      'Date: 21 July 2025 · Location: Nutan Vidyalaya, Bahadoli, Palghar.',
      'Reported reach: 350+ students (subject to source verification).',
    ],
    verificationNote: 'Library photographs awaiting upload.',
  },
  {
    id: 'nb-raincoat',
    projectId: 'rainy-day-of-dreams',
    title: 'Raincoat Distribution (A Rainy Day of Dreams)',
    category: 'Student Care',
    accentColor: '#2B5E7E',
    entries: [
      'Date: 17 August 2025 · Location: ZP Kendr School, Kev, Vikramgad, Palghar.',
      'Reported reach: 200 students (subject to source verification).',
    ],
    verificationNote: 'Event photographs awaiting upload.',
  },
];

/**
 * Verified Maharashtra Map Wall Locations.
 * Contains ONLY locations explicitly documented in supplied records — zero invented markers.
 */
export const VERIFIED_MAP_LOCATIONS: VerifiedMapLocation[] = [
  {
    id: 'loc-bahadoli',
    name: 'Bahadoli, Palghar',
    districtLabel: 'Palghar District · Nutan Vidyalaya',
    projectId: 'garad-granthalay',
    projectTitle: 'Garad Granthalay',
    date: '21 July 2025',
    summary:
      'School library initiative at Nutan Vidyalaya, Bahadoli, Palghar. Reported reach: 350+ students (subject to source verification).',
    verificationNote: 'Photograph awaiting upload · reach subject to verification.',
    mapX: 0.21,
    mapY: 0.37,
  },
  {
    id: 'loc-kev-vikramgad',
    name: 'Kev, Vikramgad, Palghar',
    districtLabel: 'Palghar District · ZP Kendr School',
    projectId: 'rainy-day-of-dreams',
    projectTitle: 'A Rainy Day of Dreams (Raincoat Distribution)',
    date: '17 August 2025',
    summary:
      'Raincoat distribution for schoolchildren at ZP Kendr School, Kev, Vikramgad, Palghar. Reported reach: 200 students (subject to source verification).',
    verificationNote: 'Photograph awaiting upload · reach subject to verification.',
    mapX: 0.27,
    mapY: 0.32,
  },
  {
    id: 'loc-amphitheatre',
    name: 'Dada Kondke Amphitheatre',
    districtLabel: 'Documented Speech Competition Venue (Exact city/district awaiting verification)',
    projectId: 'young-voices',
    projectTitle: 'Young Voices — Speech Competition',
    date: '19 February 2023',
    summary:
      '60 students participated (30 students from grades 5–7 and 30 students from grades 8–10).',
    verificationNote: 'Exact map pin confirmation & photographs awaiting source verification.',
    mapX: 0.28,
    mapY: 0.52,
  },
];
