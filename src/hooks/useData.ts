import { useLiveQuery } from 'dexie-react-hooks';
import { db, getDeckStats, getTodayStats, calculateStreak, getRetentionRate } from '@/db/database';
import type { Card, Deck, UserSettings, DeckWithStats, DailyStats } from '@/types';

/**
 * Hook to get all decks with their statistics
 */
export function useDecks(): DeckWithStats[] | undefined {
  return useLiveQuery(async () => {
    const decks = await db.decks.toArray();
    const decksWithStats: DeckWithStats[] = [];
    
    for (const deck of decks) {
      const stats = await getDeckStats(deck.id);
      decksWithStats.push({
        ...deck,
        ...stats,
        maturityPercent: stats.totalCards > 0 
          ? Math.round((stats.matureCards / stats.totalCards) * 100) 
          : 0,
      });
    }
    
    return decksWithStats;
  });
}

/**
 * Hook to get a single deck by ID
 */
export function useDeck(deckId: string | undefined): Deck | undefined {
  return useLiveQuery(
    async () => {
      if (!deckId) return undefined;
      return db.decks.get(deckId);
    },
    [deckId]
  );
}

/**
 * Hook to get a deck with stats
 */
export function useDeckWithStats(deckId: string | undefined): DeckWithStats | undefined {
  return useLiveQuery(
    async () => {
      if (!deckId) return undefined;
      const deck = await db.decks.get(deckId);
      if (!deck) return undefined;
      
      const stats = await getDeckStats(deckId);
      return {
        ...deck,
        ...stats,
        maturityPercent: stats.totalCards > 0 
          ? Math.round((stats.matureCards / stats.totalCards) * 100) 
          : 0,
      };
    },
    [deckId]
  );
}

/**
 * Hook to get cards for a deck
 */
export function useCards(deckId: string | undefined): Card[] | undefined {
  return useLiveQuery(
    async () => {
      if (!deckId) return [];
      return db.cards.where('deckId').equals(deckId).toArray();
    },
    [deckId]
  );
}

/**
 * Hook to get a single card
 */
export function useCard(cardId: string | undefined): Card | undefined {
  return useLiveQuery(
    async () => {
      if (!cardId) return undefined;
      return db.cards.get(cardId);
    },
    [cardId]
  );
}

/**
 * Hook to get user settings
 */
export function useSettings(): UserSettings | undefined {
  return useLiveQuery(() => db.settings.get('default'));
}

/**
 * Hook to get today's statistics
 */
export function useTodayStats(): DailyStats | null | undefined {
  return useLiveQuery(() => getTodayStats());
}

/**
 * Hook to get current streak
 */
export function useStreak(): number | undefined {
  return useLiveQuery(() => calculateStreak());
}

/**
 * Hook to get retention rate
 */
export function useRetentionRate(days: number = 30): number | undefined {
  return useLiveQuery(() => getRetentionRate(days), [days]);
}

/**
 * Hook to get due cards count across all decks
 */
export function useTotalDueCount(): number | undefined {
  return useLiveQuery(async () => {
    const now = Date.now();
    const cards = await db.cards.toArray();
    return cards.filter(c => c.nextReview <= now && c.learningState !== 'new').length;
  });
}

/**
 * Hook to get total new cards count
 */
export function useTotalNewCount(): number | undefined {
  return useLiveQuery(async () => {
    const cards = await db.cards.toArray();
    return cards.filter(c => c.learningState === 'new').length;
  });
}

/**
 * Hook to get daily stats for a date range
 */
export function useDailyStats(days: number = 7): DailyStats[] | undefined {
  return useLiveQuery(async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    return db.dailyStats
      .where('date')
      .aboveOrEqual(startDateStr)
      .toArray();
  }, [days]);
}

/**
 * Hook to get cards mastered count (mature cards)
 */
export function useCardsMastered(): number | undefined {
  return useLiveQuery(async () => {
    const cards = await db.cards.toArray();
    return cards.filter(c => c.learningState === 'mature').length;
  });
}

/**
 * Hook to get total cards count
 */
export function useTotalCards(): number | undefined {
  return useLiveQuery(async () => {
    return db.cards.count();
  });
}

/**
 * Hook to get card maturity breakdown
 */
export function useCardMaturity(): { mature: number; learning: number; new: number } | undefined {
  return useLiveQuery(async () => {
    const cards = await db.cards.toArray();
    return {
      mature: cards.filter(c => c.learningState === 'mature').length,
      learning: cards.filter(c => c.learningState === 'learning' || c.learningState === 'review').length,
      new: cards.filter(c => c.learningState === 'new').length,
    };
  });
}

/**
 * Hook to search cards
 */
export function useSearchCards(query: string): Card[] | undefined {
  return useLiveQuery(
    async () => {
      if (!query.trim()) return [];
      const lowerQuery = query.toLowerCase();
      const cards = await db.cards.toArray();
      return cards.filter(
        c => c.front.toLowerCase().includes(lowerQuery) || 
             c.back.toLowerCase().includes(lowerQuery)
      );
    },
    [query]
  );
}
