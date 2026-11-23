export interface BharariDialogueLine {
  id: string;
  headline: string;
  body: string;
  highlightWord: string;
}

export const MEET_BHARARI_DIALOGUES: BharariDialogueLine[] = [
  {
    id: 'intro-1',
    headline: 'Namaskar! I am Bharari.',
    body: 'I carry my little brown schoolbag across the hills of Garad Village, visiting every place where curiosity and community grow together.',
    highlightWord: 'Bharari',
  },
  {
    id: 'intro-2',
    headline: 'A thousand dreams live below these skies!',
    body: 'From the morning school bell to the quiet library shelves and the breeze on Dream Hill, every path in our village connects to another.',
    highlightWord: 'thousand dreams',
  },
  {
    id: 'intro-3',
    headline: 'Ready to spread our wings?',
    body: 'Come fly with me over the village first—and then we can land anywhere you would like to explore up close.',
    highlightWord: 'fly with me',
  },
];

export const GREET_REACTIONS: string[] = [
  'Chirp! Hello friend—look, my schoolbag is all packed for today’s journey!',
  'Ooh, thank you for saying hello! Shall we see the whole village from above?',
  'The morning breeze over the Sahyadri hills feels wonderful today!',
];
