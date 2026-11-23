import type { DestinationConfig, DestinationId } from '../types/universe';

export const VILLAGE_DESTINATIONS: DestinationConfig[] = [
  {
    id: 'village-school',
    order: 1,
    name: 'Village School',
    programmeTitle: 'Mission Bharari',
    themeLabel: 'Foundational Education',
    shortSubtitle: 'Where curiosity takes wing beneath sunlit terracotta eaves.',
    accentHex: '#D85A2A',
    accentColor: '#d85a2a',
    worldPosition: [-15.5, 6.5],
    bharariPerchOffset: [2.8, 1.35, 3.8],
    cameraOffset: [8.8, 5.2, 11.4],
    cameraTargetOffset: [0, 2.2, 0.4],
    pinHeightOffset: 5.8,
    bharariGreeting:
      'Here is the Village School! Every morning begins with open notebooks, bright questions, and young minds ready to soar.',
    flyoverCaption: 'Gliding over the Village School — home of Mission Bharari',
  },
  {
    id: 'village-library',
    order: 2,
    name: 'Village Library',
    programmeTitle: 'Garad Granthalay',
    themeLabel: 'Reading & Discovery',
    shortSubtitle: 'A quiet courtyard pavilion filled with stories, shade, and shared wonder.',
    accentHex: '#1A7B9B',
    accentColor: '#1a7b9b',
    worldPosition: [-12.5, -12.5],
    bharariPerchOffset: [3.1, 1.25, 3.2],
    cameraOffset: [9.4, 5.4, 10.6],
    cameraTargetOffset: [0, 2.1, 0],
    pinHeightOffset: 5.6,
    bharariGreeting:
      'Welcome to Garad Granthalay! Beneath these shaded arches, every shelf holds a doorway into another world.',
    flyoverCaption: 'Passing the peaceful reading courtyard of Garad Granthalay',
  },
  {
    id: 'activity-ground',
    order: 3,
    name: 'Activity Ground',
    programmeTitle: 'Youth Development',
    themeLabel: 'Play, Teamwork & Leadership',
    shortSubtitle: 'An open red-earth amphitheatre alive with movement, games, and fellowship.',
    accentHex: '#E07A22',
    accentColor: '#e07a22',
    worldPosition: [14.0, 9.5],
    bharariPerchOffset: [-3.4, 1.2, 3.4],
    cameraOffset: [-9.8, 5.8, 11.6],
    cameraTargetOffset: [0, 1.6, 0],
    pinHeightOffset: 5.4,
    bharariGreeting:
      'Look at the Activity Ground! This is where young people gather to play, practice teamwork, and build confidence together.',
    flyoverCaption: 'Soaring across the open Activity Ground for youth leadership',
  },
  {
    id: 'community-centre',
    order: 4,
    name: 'Community Centre',
    programmeTitle: 'Community Development',
    themeLabel: 'Shared Gathering & Growth',
    shortSubtitle: 'The heart of the village where neighbours meet, listen, and plan together.',
    accentHex: '#295A3E',
    accentColor: '#295a3e',
    worldPosition: [15.5, -10.5],
    bharariPerchOffset: [-3.1, 1.4, 3.5],
    cameraOffset: [-9.4, 5.4, 11.0],
    cameraTargetOffset: [0, 2.2, 0],
    pinHeightOffset: 5.9,
    bharariGreeting:
      'Here stands the Community Centre—our village chaupal, where families and neighbours share ideas for tomorrow.',
    flyoverCaption: 'Circling the welcoming veranda of the Community Centre',
  },
  {
    id: 'dream-hill',
    order: 5,
    name: 'Dream Hill',
    programmeTitle: 'About Garad Foundation',
    themeLabel: 'Vision & Purpose',
    shortSubtitle: 'A sunlit Sahyadri overlook gazing out over the whole connected village.',
    accentHex: '#A53604',
    accentColor: '#a53604',
    worldPosition: [0.5, -24.5],
    bharariPerchOffset: [2.2, 1.45, 2.8],
    cameraOffset: [8.5, 4.8, 11.8],
    cameraTargetOffset: [0, 2.6, -0.5],
    pinHeightOffset: 6.8,
    bharariGreeting:
      'From the top of Dream Hill, you can see how every path in our little world connects into one shared dream.',
    flyoverCaption: 'Rising toward Dream Hill — overlooking all of Garad Universe',
  },
];

export const DESTINATIONS_BY_ID: Record<DestinationId, DestinationConfig> =
  VILLAGE_DESTINATIONS.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<DestinationId, DestinationConfig>,
  );

export function getAdjacentDestination(
  currentId: DestinationId,
  direction: 'next' | 'prev',
): DestinationConfig {
  const idx = VILLAGE_DESTINATIONS.findIndex((d) => d.id === currentId);
  const nextIdx =
    direction === 'next'
      ? (idx + 1) % VILLAGE_DESTINATIONS.length
      : (idx - 1 + VILLAGE_DESTINATIONS.length) % VILLAGE_DESTINATIONS.length;
  return VILLAGE_DESTINATIONS[nextIdx];
}
