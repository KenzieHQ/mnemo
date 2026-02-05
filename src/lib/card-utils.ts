import type { Card, CardType } from '@/types';

/**
 * Parse cloze deletions from text
 * Format: {{c1::text to hide}} or {{c1::text::hint}}
 */
export function parseClozeText(text: string): { 
  parts: Array<{ type: 'text' | 'cloze'; content: string; hint?: string; index: number }>;
  clozeCount: number;
} {
  const clozePattern = /\{\{c(\d+)::([^:}]+)(?:::([^}]+))?\}\}/g;
  const parts: Array<{ type: 'text' | 'cloze'; content: string; hint?: string; index: number }> = [];
  let lastIndex = 0;
  let match;
  let maxClozeIndex = 0;

  while ((match = clozePattern.exec(text)) !== null) {
    // Add text before the cloze
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
        index: 0,
      });
    }

    const clozeIndex = parseInt(match[1], 10);
    maxClozeIndex = Math.max(maxClozeIndex, clozeIndex);

    parts.push({
      type: 'cloze',
      content: match[2],
      hint: match[3],
      index: clozeIndex,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
      index: 0,
    });
  }

  return { parts, clozeCount: maxClozeIndex };
}

/**
 * Render cloze text with a specific deletion hidden (string version for simple display)
 */
export function renderClozeQuestion(text: string, showIndex: number): string {
  const clozePattern = /\{\{c(\d+)::([^:}]+)(?:::([^}]+))?\}\}/g;
  
  return text.replace(clozePattern, (_match, indexStr, content, hint) => {
    const index = parseInt(indexStr, 10);
    if (index === showIndex) {
      return hint ? `[${hint}]` : '[...]';
    }
    return content;
  });
}

/**
 * Render cloze text with answer revealed (string version for simple display)
 */
export function renderClozeAnswer(text: string, showIndex: number): string {
  const clozePattern = /\{\{c(\d+)::([^:}]+)(?:::([^}]+))?\}\}/g;
  
  return text.replace(clozePattern, (_match, indexStr, content) => {
    const index = parseInt(indexStr, 10);
    if (index === showIndex) {
      return `**${content}**`;
    }
    return content;
  });
}

export interface ClozePart {
  type: 'text' | 'blank' | 'revealed';
  content: string;
  hint?: string;
}

/**
 * Parse cloze text into parts for rich rendering (question mode - blank for target)
 */
export function parseClozeForDisplay(text: string, showIndex: number, isAnswer: boolean): ClozePart[] {
  const clozePattern = /\{\{c(\d+)::([^:}]+)(?:::([^}]+))?\}\}/g;
  const parts: ClozePart[] = [];
  let lastIndex = 0;
  let match;

  while ((match = clozePattern.exec(text)) !== null) {
    // Add text before the cloze
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    const clozeIndex = parseInt(match[1], 10);
    const content = match[2];
    const hint = match[3];

    if (clozeIndex === showIndex) {
      if (isAnswer) {
        parts.push({
          type: 'revealed',
          content,
          hint,
        });
      } else {
        parts.push({
          type: 'blank',
          content: hint || '...',
          hint,
        });
      }
    } else {
      // Other clozes show their content as plain text
      parts.push({
        type: 'text',
        content,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return parts;
}

/**
 * Create cloze cards from text with multiple deletions
 */
export function createClozeCards(
  deckId: string,
  text: string,
  back: string,
  baseCardProps: Partial<Card>
): Array<Omit<Card, 'id'>> {
  const { clozeCount } = parseClozeText(text);
  const cards: Array<Omit<Card, 'id'>> = [];
  const now = Date.now();

  for (let i = 1; i <= clozeCount; i++) {
    cards.push({
      deckId,
      type: 'cloze' as CardType,
      front: text,
      back: back || text,
      clozeIndex: i,
      easeFactor: baseCardProps.easeFactor ?? 2.5,
      interval: 0,
      repetitions: 0,
      learningState: 'new',
      nextReview: now,
      lapses: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  return cards;
}

/**
 * Validate card content
 */
export function validateCard(front: string, back: string, type: CardType): { 
  isValid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];

  if (!front.trim()) {
    errors.push('Front side cannot be empty');
  }

  if (type === 'basic' && !back.trim()) {
    errors.push('Back side cannot be empty for basic cards');
  }

  if (type === 'cloze') {
    const { clozeCount } = parseClozeText(front);
    if (clozeCount === 0) {
      errors.push('Cloze cards must have at least one cloze deletion (e.g., {{c1::text}})');
    }
  }

  if (front.length > 10000) {
    errors.push('Front side is too long (max 10,000 characters)');
  }

  if (back.length > 10000) {
    errors.push('Back side is too long (max 10,000 characters)');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Search cards by text content
 */
export function searchCards(cards: Card[], query: string): Card[] {
  const lowerQuery = query.toLowerCase().trim();
  
  if (!lowerQuery) return cards;

  return cards.filter(card => 
    card.front.toLowerCase().includes(lowerQuery) ||
    card.back.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Sort cards by various criteria
 */
export type SortOption = 'created' | 'modified' | 'alphabetical' | 'due' | 'difficulty';

export function sortCards(cards: Card[], sortBy: SortOption, ascending = true): Card[] {
  const sorted = [...cards].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'created':
        comparison = a.createdAt - b.createdAt;
        break;
      case 'modified':
        comparison = a.updatedAt - b.updatedAt;
        break;
      case 'alphabetical':
        comparison = a.front.localeCompare(b.front);
        break;
      case 'due':
        comparison = a.nextReview - b.nextReview;
        break;
      case 'difficulty':
        comparison = a.easeFactor - b.easeFactor;
        break;
    }
    
    return ascending ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Get a summary of cards by state
 */
export function getCardsSummary(cards: Card[]): {
  total: number;
  new: number;
  learning: number;
  review: number;
  mature: number;
  dueNow: number;
} {
  const now = Date.now();
  
  return {
    total: cards.length,
    new: cards.filter(c => c.learningState === 'new').length,
    learning: cards.filter(c => c.learningState === 'learning').length,
    review: cards.filter(c => c.learningState === 'review').length,
    mature: cards.filter(c => c.learningState === 'mature').length,
    dueNow: cards.filter(c => c.nextReview <= now && c.learningState !== 'new').length,
  };
}

/**
 * Estimate study time based on card count
 */
export function estimateStudyTime(cardCount: number, averageTimePerCard = 8): string {
  const totalSeconds = cardCount * averageTimePerCard;
  
  if (totalSeconds < 60) {
    return '<1 min';
  } else if (totalSeconds < 3600) {
    const mins = Math.round(totalSeconds / 60);
    return `${mins} min`;
  } else {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.round((totalSeconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}
