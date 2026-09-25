import './FactionEmblem.css'

/** Decorative heraldry. The faction name is always provided by the surrounding UI. */
export function FactionEmblem({ theme, className = '' }: { theme: string; className?: string }) {
  return <svg className={`faction-emblem ${className}`} viewBox="0 0 100 100" fill="none" aria-hidden="true" focusable="false">
    {theme === 'sephosi' ? <>
      {Array.from({ length: 8 }, (_, index) => <path key={index} d="M50 4 55 29 50 25 45 29Z" fill="currentColor" transform={`rotate(${index * 45} 50 50)`} />)}
      {Array.from({ length: 8 }, (_, index) => <path key={index} d="m50 13 3 17-3-2-3 2Z" fill="currentColor" transform={`rotate(${index * 45 + 22.5} 50 50)`} />)}
      <circle cx="50" cy="50" r="21" stroke="currentColor" strokeWidth="2" />
      <circle cx="50" cy="50" r="17" stroke="currentColor" strokeWidth=".8" />
      <path d="m50 35 3 8-1 11 5 5-7 5-7-5 5-5-1-11Z" fill="currentColor" />
      <path d="m37 45 7 2-5 3m24-5-7 2 5 3M43 56l-3 3m17-3 3 3" stroke="currentColor" strokeWidth="1.5" />
    </> : theme === 'gobelins' ? <>
      <path d="m12 17 22 9 8-10 9 7 11-7 6 12 21-14-9 31-13 9-3 22-9 10-5-8-5 9-12-13-2-21-16-8Zm22 27 12 6-4 8-9-4Zm22 6 14-8-1 11-11 5Zm-8 12-4 9h11l-5-9Z" fill="currentColor" fillRule="evenodd" />
      <path d="m16 22 13 12-7 2m61-13L72 35l6-1M41 22l3 16m17-15-7 12m-14 44 1-8m19 7-2-8M8 60l16 7M77 65l13-9M20 79l9-3m42 2 9 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
    </> : theme === 'gaeli' ? <>
      <path d="M44 43C28 37 21 25 25 9m9 25C22 32 13 23 14 14m12 12C32 23 33 16 30 10M22 30C13 31 8 26 7 20m30 16c3-8 1-13-2-17M56 43c16-6 23-18 19-34M66 34c12-2 21-11 20-20M74 26c-6-3-7-10-4-16m8 20c9 1 14-4 15-10M63 36c-3-8-1-13 2-17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m40 43-11-3 5 10 8 3 2 15 6 10 6-10 2-15 8-3 5-10-11 3-10-7Zm4 9 4 4-4 1Zm12 0v5l-4-1Z" fill="currentColor" fillRule="evenodd" />
      <path d="M37 67c-12 1-16 11-9 17s17 0 22-7c5 7 15 13 22 7s3-16-9-17M28 77c3-7 14-1 22 9 8-10 19-16 22-9M50 86v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </> : <>
      <path d="m50 9 9 31 31 10-31 9-9 32-9-32L9 50l32-10Z" stroke="currentColor" strokeWidth="2" />
      <circle cx="50" cy="50" r="21" stroke="currentColor" strokeWidth="1.5" />
      <path d="m50 33 6 11 11 6-11 6-6 11-6-11-11-6 11-6Z" fill="currentColor" />
    </>}
  </svg>
}
