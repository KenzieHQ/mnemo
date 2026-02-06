// Learning states for cards
export type LearningState = 'new' | 'learning' | 'review' | 'mature';

// Card types
export type CardType = 'basic' | 'cloze';

// Rating options during review
export type Rating = 'again' | 'hard' | 'good' | 'easy';

// Card interface
export interface Card {
  id: string;
  deckId: string;
  type: CardType;
  front: string;
  back: string;
  tags: string[]; // Tags for organization
  clozeIndex?: number; // For cloze cards, which deletion is this
  easeFactor: number; // Difficulty coefficient (default 2.5)
  interval: number; // Current interval in minutes
  repetitions: number; // Number of successful reviews
  learningState: LearningState;
  nextReview: number; // Timestamp for next review
  lapses: number; // Number of times card was forgotten
  stepIndex?: number; // Current learning step index
  createdAt: number;
  updatedAt: number;
}

// Deck interface
export interface Deck {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  parentId: string | null; // For sub-decks
  newCardsPerDay: number;
  reviewsPerDay: number;
  createdAt: number;
  updatedAt: number;
}

// Customization settings for flashcard appearance
export interface CardCustomization {
  fontSize: 'small' | 'medium' | 'large' | 'x-large';
  lineSpacing: 'compact' | 'normal' | 'relaxed' | 'spacious';
  cardPadding: 'compact' | 'normal' | 'spacious';
  cardBgColor: 'white' | 'gray.50' | 'blue.50' | 'green.50' | 'orange.50' | 'purple.50';
  clozeBgColor: 'yellow.100' | 'blue.100' | 'green.100' | 'orange.100' | 'pink.100' | 'purple.100';
  clozeTextColor: 'blue.600' | 'gray.800' | 'green.600' | 'purple.600' | 'orange.600';
}

// User settings
export interface UserSettings {
  id: string;
  defaultNewCardsPerDay: number;
  defaultReviewsPerDay: number;
  defaultEaseFactor: number;
  easyBonus: number;
  hardMultiplier: number;
  intervalMultiplier: number;
  maxInterval: number; // Maximum interval in days
  learningSteps: number[]; // Learning steps in minutes
  graduatingInterval: number; // First interval after graduating in days
  // Customization
  cardCustomization: CardCustomization;
}

// Study session
export interface StudySession {
  id: string;
  deckId: string;
  startedAt: number;
  endedAt: number | null;
  cardsReviewed: number;
  cardsCorrect: number;
  newCardsStudied: number;
}

// Review log for analytics
export interface ReviewLog {
  id: string;
  cardId: string;
  deckId: string;
  rating: Rating;
  interval: number;
  easeFactor: number;
  reviewedAt: number;
  timeTaken: number; // Time to answer in ms
}

// Daily statistics
export interface DailyStats {
  id: string;
  date: string; // YYYY-MM-DD format
  cardsReviewed: number;
  cardsCorrect: number;
  newCardsStudied: number;
  timeSpent: number; // Total time in ms
  streak: number;
}

// Card with scheduling info for study session
export interface StudyCard extends Card {
  isNew: boolean;
  stepIndex?: number; // Current learning step index
}

// Deck with statistics
export interface DeckWithStats extends Deck {
  totalCards: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  matureCards: number;
  dueToday: number;
  maturityPercent: number;
}

// Import/Export formats
export type ImportFormat = 'csv' | 'tsv' | 'txt';

export interface ImportOptions {
  format: ImportFormat;
  delimiter?: string;
  hasHeader: boolean;
  frontColumn: number;
  backColumn: number;
  deckId: string;
}

export interface ExportOptions {
  format: ImportFormat;
  delimiter?: string;
  includeHeader: boolean;
  deckIds: string[];
}

// Card sorting options
export type CardSortField = 'createdAt' | 'updatedAt' | 'nextReview' | 'easeFactor' | 'front' | 'interval';
export type SortDirection = 'asc' | 'desc';

export interface CardSortOption {
  field: CardSortField;
  direction: SortDirection;
}

// Card filter options
export interface CardFilterOptions {
  deckId: string | 'all';
  cardType: CardType | 'all';
  learningState: LearningState | 'all';
  tags: string[];
  searchQuery: string;
}

// Default customization values
export const DEFAULT_CARD_CUSTOMIZATION: CardCustomization = {
  fontSize: 'medium',
  lineSpacing: 'normal',
  cardPadding: 'normal',
  cardBgColor: 'white',
  clozeBgColor: 'yellow.100',
  clozeTextColor: 'blue.600',
};
