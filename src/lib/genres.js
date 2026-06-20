const GENRE_MAP = {
  'fiction': 'Fiction',
  'literary fiction': 'Fiction',
  'historical fiction': 'Historical Fiction',
  'science fiction': 'Science Fiction',
  'fantasy': 'Fantasy',
  'mystery': 'Mystery',
  'thriller': 'Thriller',
  'thrillers': 'Thriller',
  'romance': 'Romance',
  'horror': 'Horror',
  'biography': 'Biography',
  'autobiography': 'Biography',
  'biographies': 'Biography',
  'memoir': 'Memoir',
  'memoirs': 'Memoir',
  'history': 'History',
  'science': 'Science',
  'philosophy': 'Philosophy',
  'psychology': 'Psychology',
  'self-help': 'Self-Help',
  'self help': 'Self-Help',
  'business': 'Business',
  'economics': 'Business',
  'finance': 'Finance',
  'investing': 'Finance',
  'investments': 'Finance',
  'stocks': 'Finance',
  'financial': 'Finance',
  'money': 'Finance',
  'personal finance': 'Finance',
  'poetry': 'Poetry',
  'art': 'Art',
  'cooking': 'Cooking',
  'travel': 'Travel',
  'religion': 'Religion',
  'spirituality': 'Spirituality',
  'children': 'Children',
  "children's": 'Children',
  'young adult': 'Young Adult',
  'comics': 'Comics',
  'graphic novels': 'Comics',
  'education': 'Education',
  'technology': 'Technology',
  'programming': 'Technology',
  'politics': 'Politics',
  'true crime': 'True Crime',
  'sports': 'Sports',
  'music': 'Music',
  'health': 'Health',
  'nonfiction': 'Non-Fiction',
  'non-fiction': 'Non-Fiction',
}

export function detectGenre(subjects) {
  if (!subjects || !subjects.length) return null
  for (const subject of subjects) {
    const lower = subject.toLowerCase()
    if (GENRE_MAP[lower]) return GENRE_MAP[lower]
  }
  for (const subject of subjects) {
    const lower = subject.toLowerCase()
    for (const [key, genre] of Object.entries(GENRE_MAP)) {
      if (lower.includes(key)) return genre
    }
  }
  return null
}

export async function lookupGenre(title, author) {
  const query = author
    ? `title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=5&fields=key,title,subject`
    : `title=${encodeURIComponent(title)}&limit=5&fields=key,title,subject`

  try {
    const res = await fetch(`https://openlibrary.org/search.json?${query}`)
    const data = await res.json()
    for (const doc of (data.docs || [])) {
      const genre = detectGenre(doc.subject)
      if (genre) return genre
    }
    return null
  } catch {
    return null
  }
}
