/**
 * Sanity queries customized for the EduNova Applet.
 * Maps:
 * - Course -> Subject
 * - Lesson -> Topic
 */

// Simple helper to match the next-sanity pattern in standard Vite environment
export function defineQuery(query: string): string {
  return query;
}

/**
 * Retrieves all subjects that have been created in the CMS.
 * Analogous to ALL_COURSES_QUERY
 */
export const ALL_SUBJECTS_QUERY = defineQuery(`*[_type == "subject"] | order(_createdAt desc) {
  _id,
  name,
  description,
  icon,
  color,
  image {
    asset-> {
      _id,
      url
    }
  },
  "topicCount": count(topics)
}`);

/**
 * Retrieves a single subject (course) along with all its related topics (lessons).
 * Analogous to COURSE_BY_ID_QUERY
 */
export const SUBJECT_BY_ID_QUERY = defineQuery(`*[_type == "subject" && _id == $id][0] {
  _id,
  name,
  description,
  icon,
  color,
  image {
    asset-> {
      _id,
      url
    }
  },
  topics[]-> {
    _id,
    title,
    description,
    difficulty,
    videoUrl,
    "videoAsset": videoFile.asset-> {
      playbackId,
      assetId
    }
  }
}`);

/**
 * Quick query for high-level statistics of the CMS database
 * Analogous to STATS_QUERY
 */
export const STATS_QUERY = defineQuery(`{
  "subjectCount": count(*[_type == "subject"]),
  "topicCount": count(*[_type == "topic"])
}`);

/**
 * Query for retrieving topics with full fields, including raw rich-text content arrays.
 * Analogous to LESSON_BY_ID_QUERY
 */
export const TOPIC_BY_ID_QUERY = defineQuery(`*[_type == "topic" && _id == $id][0] {
  _id,
  title,
  description,
  difficulty,
  videoUrl,
  videoFile {
    asset-> {
      playbackId,
      assetId
    }
  },
  content,
  "subject": subject-> {
    _id,
    name,
    icon,
    color
  }
}`);

/**
 * Query for active dashboard view that groups topics.
 * Analogous to DASHBOARD_COURSES_QUERY
 */
export const DASHBOARD_SUBJECTS_QUERY = defineQuery(`*[_type == "subject"] | order(_createdAt desc) {
  _id,
  name,
  description,
  icon,
  color,
  image {
    asset-> {
      _id,
      url
    }
  },
  topics[]-> {
    _id,
    title,
    difficulty
  },
  "topicCount": count(topics)
}`);
