/**
 * Compatibility bridge re-exporting the decoupled ProjectContentData
 * for existing LivingBook consumers.
 */
export {
  NOTICEBOARD_RECORDS,
  PROJECT_CONTENT_BY_ID as LIVING_BOOKS_BY_ID,
  PROJECT_CONTENT_DATA as LIVING_BOOKS,
  VERIFIED_MAP_LOCATIONS,
} from './projectContentData';
