export interface LessonSection {
  type: 'theory' | 'reflection' | 'challenge' | 'applet' | 'links';
  title: string;
  emoji: string;
  content: string;
}

export function parseLessonContent(text: string): LessonSection[] {
  if (!text) return [];
  const lines = text.split('\n');
  const sections: LessonSection[] = [];
  let currentSection: LessonSection | null = null;

  const emojiTypes: Record<string, 'theory' | 'reflection' | 'challenge' | 'applet' | 'links'> = {
    '➕': 'theory',
    '📏': 'theory',
    '🔵': 'theory',
    '✖️': 'theory',
    '🌍': 'theory',
    '💬': 'reflection',
    '🎯': 'challenge',
    '🖼️': 'applet',
    '📎': 'links',
  };

  for (let line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      if (currentSection) {
        currentSection.content += '\n';
      }
      continue;
    }

    // Detect if the line starts with one of our trigger emojis
    let detectedEmoji = '';
    for (const emoji of Object.keys(emojiTypes)) {
      if (trimmedLine.startsWith(emoji)) {
        detectedEmoji = emoji;
        break;
      }
    }

    // Also detect markdown headers starting with # or ##
    const isMarkdownHeader = trimmedLine.startsWith('#');

    if (detectedEmoji) {
      // Save current section
      if (currentSection) {
        sections.push(currentSection);
      }
      
      // Start new section
      const type = emojiTypes[detectedEmoji];
      const title = trimmedLine.replace(detectedEmoji, '').trim();
      currentSection = {
        type,
        title,
        emoji: detectedEmoji,
        content: ''
      };
    } else if (isMarkdownHeader) {
      if (currentSection) {
        sections.push(currentSection);
      }
      const title = trimmedLine.replace(/^#+\s+/, '').trim();
      currentSection = {
        type: 'theory',
        title,
        emoji: '📖',
        content: ''
      };
    } else {
      if (!currentSection) {
        // Create an initial intro section if text starts without a header
        currentSection = {
          type: 'theory',
          title: 'Guía de Estudio',
          emoji: '✨',
          content: ''
        };
      }
      currentSection.content += line + '\n';
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  // Clean up content trims
  return sections.map(s => ({
    ...s,
    content: s.content.trim()
  }));
}
