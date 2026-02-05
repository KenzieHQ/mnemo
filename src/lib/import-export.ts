import type { Card, Deck, ImportFormat, ImportOptions, ExportOptions } from '@/types';
import { db } from '@/db/database';
import { v4 as uuidv4 } from 'uuid';

/**
 * Parse delimiter-separated content into rows
 */
function parseDelimitedContent(content: string, delimiter: string): string[][] {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  return lines.map(line => {
    // Handle quoted fields
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    
    return fields;
  });
}

/**
 * Get delimiter for format
 */
function getDelimiter(format: ImportFormat, customDelimiter?: string): string {
  if (customDelimiter) return customDelimiter;
  
  switch (format) {
    case 'csv':
      return ',';
    case 'tsv':
      return '\t';
    case 'txt':
      return '\t';
    default:
      return ',';
  }
}

/**
 * Import cards from text content
 */
export async function importCards(
  content: string,
  options: ImportOptions
): Promise<{ imported: number; errors: string[] }> {
  const delimiter = getDelimiter(options.format, options.delimiter);
  const rows = parseDelimitedContent(content, delimiter);
  const errors: string[] = [];
  const cardsToAdd: Card[] = [];
  
  const startIndex = options.hasHeader ? 1 : 0;
  const now = Date.now();
  
  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 1;
    
    if (row.length <= Math.max(options.frontColumn, options.backColumn)) {
      errors.push(`Line ${lineNum}: Not enough columns`);
      continue;
    }
    
    const front = row[options.frontColumn]?.trim();
    const back = row[options.backColumn]?.trim();
    
    if (!front) {
      errors.push(`Line ${lineNum}: Front side is empty`);
      continue;
    }
    
    if (!back) {
      errors.push(`Line ${lineNum}: Back side is empty`);
      continue;
    }
    
    // Detect if this is a cloze card
    const isCloze = /\{\{c\d+::.+?\}\}/.test(front);
    
    cardsToAdd.push({
      id: uuidv4(),
      deckId: options.deckId,
      type: isCloze ? 'cloze' : 'basic',
      front,
      back,
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      learningState: 'new',
      nextReview: now,
      lapses: 0,
      createdAt: now,
      updatedAt: now,
    });
  }
  
  if (cardsToAdd.length > 0) {
    await db.cards.bulkAdd(cardsToAdd);
  }
  
  return { imported: cardsToAdd.length, errors };
}

/**
 * Export cards to text content
 */
export async function exportCards(options: ExportOptions): Promise<string> {
  const delimiter = getDelimiter(options.format, options.delimiter);
  const lines: string[] = [];
  
  if (options.includeHeader) {
    lines.push(['Front', 'Back', 'Type', 'Deck'].join(delimiter));
  }
  
  const decks = await db.decks.where('id').anyOf(options.deckIds).toArray();
  const deckMap = new Map(decks.map(d => [d.id, d.name]));
  
  for (const deckId of options.deckIds) {
    const cards = await db.cards.where('deckId').equals(deckId).toArray();
    
    for (const card of cards) {
      const fields = [
        escapeField(card.front, delimiter),
        escapeField(card.back, delimiter),
        card.type,
        deckMap.get(card.deckId) || 'Unknown',
      ];
      lines.push(fields.join(delimiter));
    }
  }
  
  return lines.join('\n');
}

/**
 * Escape a field for CSV/TSV export
 */
function escapeField(value: string, delimiter: string): string {
  if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Export a deck with all its data (for backup)
 */
export async function exportDeckBackup(deckId: string): Promise<string> {
  const deck = await db.decks.get(deckId);
  if (!deck) throw new Error('Deck not found');
  
  const cards = await db.cards.where('deckId').equals(deckId).toArray();
  
  const backup = {
    version: 1,
    exportedAt: Date.now(),
    deck,
    cards,
  };
  
  return JSON.stringify(backup, null, 2);
}

/**
 * Import a deck from backup
 */
export async function importDeckBackup(content: string): Promise<{ 
  deckId: string; 
  cardsImported: number 
}> {
  const backup = JSON.parse(content);
  
  if (!backup.version || !backup.deck || !backup.cards) {
    throw new Error('Invalid backup file format');
  }
  
  const now = Date.now();
  const newDeckId = uuidv4();
  
  // Create deck with new ID
  const newDeck: Deck = {
    ...backup.deck,
    id: newDeckId,
    name: `${backup.deck.name} (Imported)`,
    createdAt: now,
    updatedAt: now,
  };
  
  await db.decks.add(newDeck);
  
  // Create cards with new IDs
  const newCards: Card[] = backup.cards.map((card: Card) => ({
    ...card,
    id: uuidv4(),
    deckId: newDeckId,
    createdAt: now,
    updatedAt: now,
  }));
  
  await db.cards.bulkAdd(newCards);
  
  return { deckId: newDeckId, cardsImported: newCards.length };
}

/**
 * Download content as file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read file content
 */
export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
