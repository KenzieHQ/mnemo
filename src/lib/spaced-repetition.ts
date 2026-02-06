import type { Card, Rating, LearningState, UserSettings, StudyCard } from '@/types';
import { DEFAULT_CARD_CUSTOMIZATION } from '@/types';

// Default settings for calculations
const DEFAULT_SETTINGS: UserSettings = {
  id: 'default',
  defaultNewCardsPerDay: 20,
  defaultReviewsPerDay: 200,
  defaultEaseFactor: 2.5,
  easyBonus: 1.3,
  hardMultiplier: 1.2,
  intervalMultiplier: 1.0,
  maxInterval: 365,
  learningSteps: [1, 10], // 1 min, 10 min
  graduatingInterval: 1, // 1 day
  cardCustomization: DEFAULT_CARD_CUSTOMIZATION,
};

// Minimum ease factor
const MIN_EASE_FACTOR = 1.3;

// Time constants
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

interface SchedulingResult {
  card: Card;
  nextReview: number;
}

/**
 * Calculate the next review time and update card state based on rating
 */
export function scheduleCard(
  card: StudyCard,
  rating: Rating,
  settings: UserSettings = DEFAULT_SETTINGS
): SchedulingResult {
  const now = Date.now();
  const updatedCard = { ...card, updatedAt: now };

  // Handle based on current learning state
  if (card.learningState === 'new' || card.learningState === 'learning') {
    return handleLearningCard(updatedCard, rating, settings, now);
  } else {
    return handleReviewCard(updatedCard, rating, settings, now);
  }
}

/**
 * Handle scheduling for new and learning cards
 */
function handleLearningCard(
  card: StudyCard,
  rating: Rating,
  settings: UserSettings,
  now: number
): SchedulingResult {
  const steps = settings.learningSteps;
  const currentStep = card.stepIndex ?? 0;

  switch (rating) {
    case 'again': {
      // Reset to first step, card stays in learning
      return {
        card: {
          ...card,
          learningState: 'learning' as LearningState,
          easeFactor: Math.max(MIN_EASE_FACTOR, card.easeFactor - 0.2),
          repetitions: 0,
          lapses: card.lapses + (card.learningState === 'learning' ? 1 : 0),
          stepIndex: 0,
        },
        nextReview: now + steps[0] * MINUTE,
      };
    }

    case 'hard': {
      // Repeat current step or slightly longer
      const stepTime = steps[currentStep] * 1.5;
      return {
        card: {
          ...card,
          learningState: 'learning' as LearningState,
          stepIndex: currentStep,
        },
        nextReview: now + stepTime * MINUTE,
      };
    }

    case 'good': {
      // Move to next step or graduate
      const nextStep = currentStep + 1;
      
      if (nextStep >= steps.length) {
        // Graduate to review
        return {
          card: {
            ...card,
            learningState: 'review' as LearningState,
            interval: settings.graduatingInterval * DAY / MINUTE, // Store in minutes
            repetitions: 1,
            stepIndex: undefined,
          },
          nextReview: now + settings.graduatingInterval * DAY,
        };
      }
      
      return {
        card: {
          ...card,
          learningState: 'learning' as LearningState,
          stepIndex: nextStep,
        },
        nextReview: now + steps[nextStep] * MINUTE,
      };
    }

    case 'easy': {
      // Graduate immediately with bonus interval
      const easyInterval = settings.graduatingInterval * settings.easyBonus;
      return {
        card: {
          ...card,
          learningState: 'review' as LearningState,
          interval: easyInterval * DAY / MINUTE,
          easeFactor: card.easeFactor + 0.15,
          repetitions: 1,
          stepIndex: undefined,
        },
        nextReview: now + easyInterval * DAY,
      };
    }
  }
}

/**
 * Handle scheduling for review and mature cards
 */
function handleReviewCard(
  card: StudyCard,
  rating: Rating,
  settings: UserSettings,
  now: number
): SchedulingResult {
  const currentIntervalDays = card.interval * MINUTE / DAY;
  
  switch (rating) {
    case 'again': {
      // Card is forgotten - reset to learning
      const relearningSteps = [10]; // 10 minute relearning step
      return {
        card: {
          ...card,
          learningState: 'learning' as LearningState,
          easeFactor: Math.max(MIN_EASE_FACTOR, card.easeFactor - 0.2),
          repetitions: 0,
          lapses: card.lapses + 1,
          interval: Math.max(1, currentIntervalDays * 0.5) * DAY / MINUTE, // Reduce interval by half
          stepIndex: 0,
        },
        nextReview: now + relearningSteps[0] * MINUTE,
      };
    }

    case 'hard': {
      // Slight interval increase with ease penalty
      const newInterval = currentIntervalDays * settings.hardMultiplier;
      const cappedInterval = Math.min(newInterval, settings.maxInterval);
      
      return {
        card: {
          ...card,
          learningState: getLearningState(cappedInterval),
          easeFactor: Math.max(MIN_EASE_FACTOR, card.easeFactor - 0.15),
          interval: cappedInterval * DAY / MINUTE,
          repetitions: card.repetitions + 1,
        },
        nextReview: now + cappedInterval * DAY,
      };
    }

    case 'good': {
      // Standard interval increase
      const newInterval = currentIntervalDays * card.easeFactor * settings.intervalMultiplier;
      const cappedInterval = Math.min(newInterval, settings.maxInterval);
      
      return {
        card: {
          ...card,
          learningState: getLearningState(cappedInterval),
          interval: cappedInterval * DAY / MINUTE,
          repetitions: card.repetitions + 1,
        },
        nextReview: now + cappedInterval * DAY,
      };
    }

    case 'easy': {
      // Significant interval increase with ease bonus
      const newInterval = currentIntervalDays * card.easeFactor * settings.easyBonus * settings.intervalMultiplier;
      const cappedInterval = Math.min(newInterval, settings.maxInterval);
      
      return {
        card: {
          ...card,
          learningState: getLearningState(cappedInterval),
          easeFactor: card.easeFactor + 0.15,
          interval: cappedInterval * DAY / MINUTE,
          repetitions: card.repetitions + 1,
        },
        nextReview: now + cappedInterval * DAY,
      };
    }
  }
}

/**
 * Determine learning state based on interval
 */
function getLearningState(intervalDays: number): LearningState {
  if (intervalDays >= 21) {
    return 'mature';
  }
  return 'review';
}

/**
 * Get the estimated next intervals for each rating option
 */
export function getNextIntervals(
  card: StudyCard,
  settings: UserSettings = DEFAULT_SETTINGS
): Record<Rating, string> {
  const intervals: Record<Rating, string> = {
    again: '',
    hard: '',
    good: '',
    easy: '',
  };

  const ratings: Rating[] = ['again', 'hard', 'good', 'easy'];
  
  for (const rating of ratings) {
    const result = scheduleCard(card, rating, settings);
    const nextReview = result.nextReview;
    const diff = nextReview - Date.now();
    intervals[rating] = formatInterval(diff);
  }

  return intervals;
}

/**
 * Format interval for display
 */
export function formatInterval(ms: number): string {
  if (ms < MINUTE) {
    return '<1m';
  } else if (ms < HOUR) {
    const mins = Math.round(ms / MINUTE);
    return `${mins}m`;
  } else if (ms < DAY) {
    const hours = Math.round(ms / HOUR);
    return `${hours}h`;
  } else if (ms < 30 * DAY) {
    const days = Math.round(ms / DAY);
    return `${days}d`;
  } else if (ms < 365 * DAY) {
    const months = Math.round(ms / (30 * DAY));
    return `${months}mo`;
  } else {
    const years = (ms / (365 * DAY)).toFixed(1);
    return `${years}y`;
  }
}

/**
 * Create a new card with default values
 */
export function createCard(
  deckId: string,
  front: string,
  back: string,
  type: 'basic' | 'cloze' = 'basic',
  settings: UserSettings = DEFAULT_SETTINGS
): Omit<Card, 'id'> {
  const now = Date.now();
  
  return {
    deckId,
    type,
    front,
    back,
    tags: [],
    easeFactor: settings.defaultEaseFactor,
    interval: 0,
    repetitions: 0,
    learningState: 'new',
    nextReview: now, // New cards are immediately available
    lapses: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Build a study queue from due and new cards
 */
export function buildStudyQueue(
  dueCards: Card[],
  newCards: Card[],
  newCardsLimit: number
): StudyCard[] {
  // Sort due cards by urgency (most overdue first)
  const sortedDue = [...dueCards].sort((a, b) => a.nextReview - b.nextReview);
  
  // Limit new cards
  const limitedNew = newCards.slice(0, newCardsLimit);
  
  // Interleave new cards with reviews (1 new per 10 reviews)
  const queue: StudyCard[] = [];
  let newIndex = 0;
  
  for (let i = 0; i < sortedDue.length; i++) {
    queue.push({ ...sortedDue[i], isNew: false });
    
    // Add a new card every 10 reviews
    if ((i + 1) % 10 === 0 && newIndex < limitedNew.length) {
      queue.push({ ...limitedNew[newIndex], isNew: true, stepIndex: 0 });
      newIndex++;
    }
  }
  
  // Add remaining new cards at the end
  while (newIndex < limitedNew.length) {
    queue.push({ ...limitedNew[newIndex], isNew: true, stepIndex: 0 });
    newIndex++;
  }
  
  return queue;
}

/**
 * Calculate cards that need to be reinserted in the session (Again cards)
 */
export function getReinsertPosition(queueLength: number): number {
  // Reinsert after 8-12 cards or at the end if queue is short
  const minPosition = Math.min(8, queueLength);
  const maxPosition = Math.min(12, queueLength);
  return Math.floor(Math.random() * (maxPosition - minPosition + 1)) + minPosition;
}
