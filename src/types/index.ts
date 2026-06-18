export interface IGDBGame {
  id: number;
  name: string;
  summary?: string;
  cover?: { url: string };
  first_release_date?: number;
  platforms?: { name: string }[];
  genres?: { name: string }[];
}

export interface SearchQuery {
  q: string;
}

export interface UpdateStatusBody {
  status: 'WISHLIST' | 'OWNED' | 'PLAYING' | 'COMPLETED' | 'DROPPED';
}
