export type BoardQuestion = {id: string; sub: string; ask: string; n: number; tracks: [string, number][]};
export type BoardIndex = {board: BoardQuestion[]; docs: Set<string>[]; idf: Map<string, number>};
export type Matched = {id: string; sub: string; ask: string; n: number; fit: number};
export type Pooled = {id: string; points: number; threads: number; asks: string[]};
export function tokens(text: string): string[];
export function buildIndex(board: BoardQuestion[]): BoardIndex;
export function matchQuestions(index: BoardIndex, request: string, limit?: number): {q: BoardQuestion; s: number}[];
export function pool(matches: {q: BoardQuestion; s: number}[], perThread?: number): Pooled[];
export function answer(index: BoardIndex, request: string, opts?: {limit?: number; exclude?: Set<string>}): {matches: Matched[]; songs: Pooled[]};
