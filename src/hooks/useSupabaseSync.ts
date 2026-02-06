import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../db/database';
import type { Deck, Card, UserSettings } from '../types';
import type { Tables, TablesInsert } from '../types/supabase';

// Type aliases for Supabase tables
type DeckRow = Tables<'decks'>;
type CardRow = Tables<'cards'>;
type CardInsert = TablesInsert<'cards'>;
type ReviewStateRow = Tables<'review_states'>;
type ReviewStateInsert = TablesInsert<'review_states'>;
type UserSettingsRow = Tables<'user_settings'>;

// Queue for offline changes
interface SyncQueueItem {
  id: string;
  type: 'deck' | 'card' | 'settings' | 'studySession';
  action: 'create' | 'update' | 'delete';
  data: unknown;
  timestamp: number;
}

const SYNC_QUEUE_KEY = 'mnemo_sync_queue';

const getSyncQueue = (): SyncQueueItem[] => {
  try {
    const queue = localStorage.getItem(SYNC_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch {
    return [];
  }
};

const addToSyncQueue = (item: Omit<SyncQueueItem, 'id' | 'timestamp'>) => {
  const queue = getSyncQueue();
  queue.push({
    ...item,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
};

const clearSyncQueue = () => {
  localStorage.removeItem(SYNC_QUEUE_KEY);
};

export const useSupabaseSync = () => {
  const { user, isConfigured } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncToCloud = useCallback(async () => {
    if (!user || !isConfigured || !isOnline) return;

    setIsSyncing(true);
    try {
      const queue = getSyncQueue();
      
      for (const item of queue) {
        try {
          switch (item.type) {
            case 'deck':
              if (item.action === 'create' || item.action === 'update') {
                const deck = item.data as Deck;
                await supabase.from('decks').upsert({
                  id: deck.id,
                  user_id: user.id,
                  title: deck.name,
                  description: deck.description || null,
                  color: deck.color,
                  icon: deck.icon,
                  parent_id: deck.parentId || null,
                  updated_at: new Date().toISOString(),
                } as DeckRow);
              } else if (item.action === 'delete') {
                await supabase.from('decks').delete().eq('id', (item.data as { id: string }).id);
              }
              break;

            case 'card':
              if (item.action === 'create' || item.action === 'update') {
                const card = item.data as Card;
                const cardData: CardInsert = {
                  id: card.id,
                  deck_id: card.deckId,
                  user_id: user.id,
                  front_content: card.front,
                  back_content: card.back,
                  card_type: card.type as 'basic' | 'cloze',
                  tags: [] as string[],
                };
                await supabase.from('cards').upsert(cardData);
                
                const reviewData: ReviewStateInsert = {
                  id: card.id,
                  card_id: card.id,
                  user_id: user.id,
                  ease_factor: card.easeFactor,
                  interval: card.interval,
                  repetition_count: card.repetitions,
                  learning_state: card.learningState as 'new' | 'learning' | 'review' | 'mature',
                  step_index: card.stepIndex || 0,
                  next_review_at: new Date(card.nextReview).toISOString(),
                };
                await supabase.from('review_states').upsert(reviewData);
              } else if (item.action === 'delete') {
                await supabase.from('cards').delete().eq('id', (item.data as { id: string }).id);
              }
              break;
          }
        } catch (err) {
          console.error('Error processing sync queue item:', err);
        }
      }

      clearSyncQueue();
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Error syncing to cloud:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [user, isConfigured, isOnline]);

  const syncFromCloud = useCallback(async () => {
    if (!user || !isConfigured || !isOnline) return;

    setIsSyncing(true);
    try {
      const [decksRes, cardsRes, reviewStatesRes, settingsRes] = await Promise.all([
        supabase.from('decks').select('*').eq('user_id', user.id),
        supabase.from('cards').select('*').eq('user_id', user.id),
        supabase.from('review_states').select('*').eq('user_id', user.id),
        supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
      ]);

      if (decksRes.data) {
        const decks = decksRes.data as DeckRow[];
        for (const deck of decks) {
          const localDeck: Deck = {
            id: deck.id,
            name: deck.title,
            description: deck.description || '',
            color: deck.color,
            icon: deck.icon,
            parentId: deck.parent_id,
            newCardsPerDay: 20,
            reviewsPerDay: 200,
            createdAt: new Date(deck.created_at).getTime(),
            updatedAt: new Date(deck.updated_at).getTime(),
          };
          await db.decks.put(localDeck);
        }
      }

      if (cardsRes.data && reviewStatesRes.data) {
        const cards = cardsRes.data as CardRow[];
        const reviewStates = reviewStatesRes.data as ReviewStateRow[];
        const reviewStateMap = new Map(reviewStates.map(rs => [rs.card_id, rs]));

        for (const card of cards) {
          const reviewState = reviewStateMap.get(card.id);
          const localCard: Card = {
            id: card.id,
            deckId: card.deck_id,
            type: card.card_type as 'basic' | 'cloze',
            front: card.front_content,
            back: card.back_content,
            tags: [],
            easeFactor: reviewState?.ease_factor ?? 2.5,
            interval: reviewState?.interval ?? 0,
            repetitions: reviewState?.repetition_count ?? 0,
            learningState: (reviewState?.learning_state as Card['learningState']) ?? 'new',
            nextReview: reviewState?.next_review_at 
              ? new Date(reviewState.next_review_at).getTime() 
              : Date.now(),
            lapses: 0,
            stepIndex: reviewState?.step_index ?? 0,
            createdAt: new Date(card.created_at).getTime(),
            updatedAt: new Date(card.updated_at).getTime(),
          };
          await db.cards.put(localCard);
        }
      }

      if (settingsRes.data) {
        const settings = settingsRes.data as UserSettingsRow;
        const currentSettings = await db.settings.get('default');
        const localSettings: UserSettings = {
          id: 'default',
          defaultNewCardsPerDay: settings.new_cards_per_day,
          defaultReviewsPerDay: settings.reviews_per_day,
          defaultEaseFactor: settings.starting_ease,
          easyBonus: settings.easy_bonus,
          hardMultiplier: settings.hard_interval_modifier,
          intervalMultiplier: settings.interval_modifier,
          maxInterval: 365,
          learningSteps: settings.learn_steps,
          graduatingInterval: settings.graduating_interval,
          cardCustomization: currentSettings?.cardCustomization ?? {
            fontSize: 'medium',
            lineSpacing: 'normal',
            cardPadding: 'normal',
            cardBgColor: 'white',
            clozeBgColor: 'yellow.100',
            clozeTextColor: 'blue.600',
          },
        };
        await db.settings.put(localSettings);
      }

      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Error syncing from cloud:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [user, isConfigured, isOnline]);

  const fullSync = useCallback(async () => {
    await syncToCloud();
    await syncFromCloud();
  }, [syncToCloud, syncFromCloud]);

  useEffect(() => {
    if (isOnline && user && isConfigured) {
      const queue = getSyncQueue();
      if (queue.length > 0) {
        syncToCloud();
      }
    }
  }, [isOnline, user, isConfigured, syncToCloud]);

  return {
    isSyncing,
    lastSyncTime,
    isOnline,
    syncToCloud,
    syncFromCloud,
    fullSync,
    addToSyncQueue,
  };
};

export const useSyncedData = () => {
  const { user, isConfigured } = useAuth();
  const { isOnline } = useSupabaseSync();

  const syncOperation = useCallback(
    (type: SyncQueueItem['type'], action: SyncQueueItem['action'], data: unknown) => {
      if (user && isConfigured && !isOnline) {
        addToSyncQueue({ type, action, data });
      }
    },
    [user, isConfigured, isOnline]
  );

  const createDeck = useCallback(
    async (deck: Omit<Deck, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newDeck: Deck = {
        ...deck,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.decks.add(newDeck);

      if (user && isConfigured && isOnline) {
        await supabase.from('decks').insert({
          id: newDeck.id,
          user_id: user.id,
          title: newDeck.name,
          description: newDeck.description || null,
          color: newDeck.color,
          icon: newDeck.icon,
          parent_id: newDeck.parentId || null,
        } as DeckRow);
      } else {
        syncOperation('deck', 'create', newDeck);
      }

      return newDeck;
    },
    [user, isConfigured, isOnline, syncOperation]
  );

  const updateDeck = useCallback(
    async (id: string, updates: Partial<Deck>) => {
      const updatedDeck = { ...updates, id, updatedAt: Date.now() };
      await db.decks.update(id, updatedDeck);

      if (user && isConfigured && isOnline) {
        await supabase.from('decks').update({
          title: updates.name,
          description: updates.description,
          color: updates.color,
          icon: updates.icon,
          parent_id: updates.parentId,
          updated_at: new Date().toISOString(),
        }).eq('id', id);
      } else {
        const deck = await db.decks.get(id);
        if (deck) {
          syncOperation('deck', 'update', deck);
        }
      }
    },
    [user, isConfigured, isOnline, syncOperation]
  );

  const deleteDeck = useCallback(
    async (id: string) => {
      const cards = await db.cards.where('deckId').equals(id).toArray();
      await db.cards.where('deckId').equals(id).delete();
      await db.decks.delete(id);

      if (user && isConfigured && isOnline) {
        await supabase.from('decks').delete().eq('id', id);
      } else {
        syncOperation('deck', 'delete', { id });
        cards.forEach(card => syncOperation('card', 'delete', { id: card.id }));
      }
    },
    [user, isConfigured, isOnline, syncOperation]
  );

  const createCard = useCallback(
    async (card: Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'easeFactor' | 'interval' | 'repetitions' | 'learningState' | 'nextReview' | 'lapses'>) => {
      const newCard: Card = {
        ...card,
        id: crypto.randomUUID(),
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        learningState: 'new',
        nextReview: Date.now(),
        lapses: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.cards.add(newCard);

      if (user && isConfigured && isOnline) {
        const cardData: CardInsert = {
          id: newCard.id,
          deck_id: newCard.deckId,
          user_id: user.id,
          front_content: newCard.front,
          back_content: newCard.back,
          card_type: newCard.type as 'basic' | 'cloze',
          tags: [] as string[],
        };
        await supabase.from('cards').insert(cardData);

        const reviewData: ReviewStateInsert = {
          id: newCard.id,
          card_id: newCard.id,
          user_id: user.id,
          ease_factor: newCard.easeFactor,
          interval: newCard.interval,
          repetition_count: newCard.repetitions,
          learning_state: newCard.learningState as 'new' | 'learning' | 'review' | 'mature',
          step_index: 0,
          next_review_at: new Date(newCard.nextReview).toISOString(),
        };
        await supabase.from('review_states').insert(reviewData);
      } else {
        syncOperation('card', 'create', newCard);
      }

      return newCard;
    },
    [user, isConfigured, isOnline, syncOperation]
  );

  const updateCard = useCallback(
    async (id: string, updates: Partial<Card>) => {
      await db.cards.update(id, { ...updates, updatedAt: Date.now() });

      if (user && isConfigured && isOnline) {
        if (updates.front !== undefined || updates.back !== undefined || updates.type !== undefined) {
          await supabase.from('cards').update({
            front_content: updates.front,
            back_content: updates.back,
            card_type: updates.type as 'basic' | 'cloze' | undefined,
            updated_at: new Date().toISOString(),
          }).eq('id', id);
        }

        if (updates.easeFactor !== undefined || updates.interval !== undefined || 
            updates.repetitions !== undefined || updates.learningState !== undefined || updates.nextReview !== undefined) {
          await supabase.from('review_states').update({
            ease_factor: updates.easeFactor,
            interval: updates.interval,
            repetition_count: updates.repetitions,
            learning_state: updates.learningState as 'new' | 'learning' | 'review' | 'mature' | undefined,
            step_index: updates.stepIndex,
            next_review_at: updates.nextReview ? new Date(updates.nextReview).toISOString() : undefined,
            updated_at: new Date().toISOString(),
          }).eq('card_id', id);
        }
      } else {
        const card = await db.cards.get(id);
        if (card) {
          syncOperation('card', 'update', card);
        }
      }
    },
    [user, isConfigured, isOnline, syncOperation]
  );

  const deleteCard = useCallback(
    async (id: string) => {
      await db.cards.delete(id);

      if (user && isConfigured && isOnline) {
        await supabase.from('cards').delete().eq('id', id);
      } else {
        syncOperation('card', 'delete', { id });
      }
    },
    [user, isConfigured, isOnline, syncOperation]
  );

  return {
    createDeck,
    updateDeck,
    deleteDeck,
    createCard,
    updateCard,
    deleteCard,
  };
};
