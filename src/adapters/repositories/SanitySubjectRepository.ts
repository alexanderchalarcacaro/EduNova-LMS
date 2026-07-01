import { SubjectRepositoryPort } from '../../core/ports/SubjectRepositoryPort';
import { Subject } from '../../types';
import { sanityClient } from '../../services/sanity';
import { DEFAULT_SUBJECTS } from '../../hooks/useSanitySubjects';

export class SanitySubjectRepository implements SubjectRepositoryPort {
  async getSubjects(): Promise<Subject[]> {
    try {
      const query = `*[_type == "subject"] {
        "id": _id,
        "name": coalesce(name, title),
        description,
        icon,
        color,
        tier,
        "imageUrl": image.asset->url,
        "topics": coalesce(
          topics[]-> {
            "id": _id,
            "name": coalesce(title, name),
            description,
            difficulty,
            videoUrl,
            content,
            "videoAsset": videoFile.asset->{
              playbackId,
              assetId
            }
          },
          *[_type == "topic" && references(^._id)] {
            "id": _id,
            "name": coalesce(title, name),
            description,
            difficulty,
            videoUrl,
            content,
            "videoAsset": videoFile.asset->{
              playbackId,
              assetId
            }
          }
        )
      }`;
      
      const data = await sanityClient.fetch(query);
      if (data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id || '',
          name: item.name || '',
          description: item.description || '',
          icon: item.icon || 'BookOpen',
          color: item.color || 'bg-[#2563eb]',
          tier: item.tier,
          imageUrl: item.imageUrl,
          topics: (item.topics || []).map((t: any) => ({
            id: t.id || '',
            name: t.name || '',
            description: t.description || '',
            difficulty: t.difficulty || 'Intermediate',
            videoAsset: t.videoAsset,
            videoUrl: t.videoUrl,
            content: t.content
          }))
        }));
      }
    } catch (error) {
      // Fallback silently on network errors
    }
    return DEFAULT_SUBJECTS;
  }
}
