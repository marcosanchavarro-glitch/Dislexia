export function selectHeroBooks(content, failed = new Set()) {
  const books = content.filter((book) => {
    if (
      book.type !== 'libro' ||
      book.status !== 'PUBLISHED' ||
      !book.slug ||
      !book.imageUrl ||
      failed.has(`${book.id}:${book.imageUrl}`)
    )
      return false;
    try {
      const url = new URL(book.imageUrl);
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
    } catch {
      return false;
    }
  });
  return [
    ...books.filter((book) => book.recommended),
    ...books.filter((book) => !book.recommended),
  ].slice(0, 3);
}
