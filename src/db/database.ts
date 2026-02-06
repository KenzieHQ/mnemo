import Dexie, { Table } from 'dexie';
import type { Card, Deck, UserSettings, StudySession, ReviewLog, DailyStats } from '@/types';
import { DEFAULT_CARD_CUSTOMIZATION } from '@/types';

export class MnemoDatabase extends Dexie {
  cards!: Table<Card>;
  decks!: Table<Deck>;
  settings!: Table<UserSettings>;
  sessions!: Table<StudySession>;
  reviewLogs!: Table<ReviewLog>;
  dailyStats!: Table<DailyStats>;

  constructor() {
    super('mnemo');
    
    // Version 2 adds tags to cards
    this.version(2).stores({
      cards: 'id, deckId, type, learningState, nextReview, createdAt, *tags',
      decks: 'id, parentId, name, createdAt',
      settings: 'id',
      sessions: 'id, deckId, startedAt',
      reviewLogs: 'id, cardId, deckId, reviewedAt',
      dailyStats: 'id, date',
    }).upgrade(tx => {
      // Migrate existing cards to have empty tags array
      return tx.table('cards').toCollection().modify(card => {
        if (!card.tags) {
          card.tags = [];
        }
      });
    });
    
    // Keep version 1 for initial structure
    this.version(1).stores({
      cards: 'id, deckId, type, learningState, nextReview, createdAt',
      decks: 'id, parentId, name, createdAt',
      settings: 'id',
      sessions: 'id, deckId, startedAt',
      reviewLogs: 'id, cardId, deckId, reviewedAt',
      dailyStats: 'id, date',
    });
  }
}

export const db = new MnemoDatabase();

// Initialize default settings if not exists
export async function initializeDatabase(): Promise<void> {
  const existingSettings = await db.settings.get('default');
  
  if (!existingSettings) {
    await db.settings.add({
      id: 'default',
      defaultNewCardsPerDay: 20,
      defaultReviewsPerDay: 200,
      defaultEaseFactor: 2.5,
      easyBonus: 1.3,
      hardMultiplier: 1.2,
      intervalMultiplier: 1.0,
      maxInterval: 365, // 1 year max
      learningSteps: [1, 10], // 1 min, 10 min
      graduatingInterval: 1, // 1 day
      cardCustomization: DEFAULT_CARD_CUSTOMIZATION,
    });
  } else if (!existingSettings.cardCustomization) {
    // Migrate existing settings to add customization
    await db.settings.update('default', {
      cardCustomization: DEFAULT_CARD_CUSTOMIZATION,
    });
  }
}

// Get all cards for a deck (including sub-decks)
export async function getCardsForDeck(deckId: string, includeSubDecks = true): Promise<Card[]> {
  if (!includeSubDecks) {
    return db.cards.where('deckId').equals(deckId).toArray();
  }

  const deckIds = await getAllSubDeckIds(deckId);
  deckIds.push(deckId);
  
  return db.cards.where('deckId').anyOf(deckIds).toArray();
}

// Get all sub-deck IDs recursively
export async function getAllSubDeckIds(parentId: string): Promise<string[]> {
  const subDecks = await db.decks.where('parentId').equals(parentId).toArray();
  const ids: string[] = [];
  
  for (const deck of subDecks) {
    ids.push(deck.id);
    const childIds = await getAllSubDeckIds(deck.id);
    ids.push(...childIds);
  }
  
  return ids;
}

// Get due cards for a deck
export async function getDueCards(deckId: string): Promise<Card[]> {
  const now = Date.now();
  const deckIds = await getAllSubDeckIds(deckId);
  deckIds.push(deckId);
  
  return db.cards
    .where('deckId')
    .anyOf(deckIds)
    .filter(card => card.nextReview <= now && card.learningState !== 'new')
    .toArray();
}

// Get new cards for a deck
export async function getNewCards(deckId: string, limit: number): Promise<Card[]> {
  const deckIds = await getAllSubDeckIds(deckId);
  deckIds.push(deckId);
  
  return db.cards
    .where('deckId')
    .anyOf(deckIds)
    .filter(card => card.learningState === 'new')
    .limit(limit)
    .toArray();
}

// Get deck statistics
export async function getDeckStats(deckId: string): Promise<{
  totalCards: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  matureCards: number;
  dueToday: number;
}> {
  const cards = await getCardsForDeck(deckId);
  const now = Date.now();
  
  return {
    totalCards: cards.length,
    newCards: cards.filter(c => c.learningState === 'new').length,
    learningCards: cards.filter(c => c.learningState === 'learning').length,
    reviewCards: cards.filter(c => c.learningState === 'review').length,
    matureCards: cards.filter(c => c.learningState === 'mature').length,
    dueToday: cards.filter(c => c.nextReview <= now && c.learningState !== 'new').length,
  };
}

// Get today's stats
export async function getTodayStats(): Promise<DailyStats | null> {
  const today = new Date().toISOString().split('T')[0];
  const stats = await db.dailyStats.where('date').equals(today).first();
  return stats ?? null;
}

// Update or create today's stats
export async function updateTodayStats(updates: Partial<DailyStats>): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const existing = await db.dailyStats.where('date').equals(today).first();
  
  if (existing) {
    await db.dailyStats.update(existing.id, updates);
  } else {
    await db.dailyStats.add({
      id: crypto.randomUUID(),
      date: today,
      cardsReviewed: 0,
      cardsCorrect: 0,
      newCardsStudied: 0,
      timeSpent: 0,
      streak: 0,
      ...updates,
    });
  }
}

// Calculate current streak
export async function calculateStreak(): Promise<number> {
  const stats = await db.dailyStats.orderBy('date').reverse().toArray();
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < stats.length; i++) {
    const statDate = new Date(stats[i].date);
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);
    
    if (statDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
      if (stats[i].cardsReviewed > 0) {
        streak++;
      } else {
        break;
      }
    } else {
      break;
    }
  }
  
  return streak;
}

// Get retention rate for last N days
export async function getRetentionRate(days: number): Promise<number> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];
  
  const stats = await db.dailyStats
    .where('date')
    .aboveOrEqual(startDateStr)
    .toArray();
  
  const totalReviewed = stats.reduce((sum, s) => sum + s.cardsReviewed, 0);
  const totalCorrect = stats.reduce((sum, s) => sum + s.cardsCorrect, 0);
  
  return totalReviewed > 0 ? (totalCorrect / totalReviewed) * 100 : 0;
}

// Get review logs for analytics
export async function getReviewLogs(days: number): Promise<ReviewLog[]> {
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
  
  return db.reviewLogs
    .where('reviewedAt')
    .aboveOrEqual(startTime)
    .toArray();
}
