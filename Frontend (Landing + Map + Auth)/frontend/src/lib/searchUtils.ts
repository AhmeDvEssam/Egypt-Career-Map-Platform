export function buildSmartSearchClause(q: string) {
  const trimmed = q.trim();
  if (!trimmed) return null;

  const words = trimmed.split(/\s+/).filter(w => w.length > 1);
  const isInternQuery = /^(intern|internship|interns|تدريب|student)$/i.test(trimmed);

  // Dedicated Intent Handling for Internships & Students
  // Prevents false matches on "International" companies or "Internal Audit"
  if (isInternQuery) {
    return {
      OR: [
        { jobType: { contains: 'intern', mode: 'insensitive' } },
        { careerLevel: { in: ['Student', 'Internship'] } },
        { titleRaw: { contains: 'intern', mode: 'insensitive' } },
        { titleNormalized: { contains: 'intern', mode: 'insensitive' } },
      ],
      NOT: [
        { titleRaw: { contains: 'internal', mode: 'insensitive' } },
        { titleRaw: { contains: 'international', mode: 'insensitive' } },
        { companyName: { contains: 'international', mode: 'insensitive' } }
      ]
    };
  }

  const orConditions: any[] = [
    // 1. Direct title match (Highest relevance)
    { titleRaw: { contains: trimmed, mode: 'insensitive' } },
    { titleNormalized: { contains: trimmed, mode: 'insensitive' } },
    // 2. Direct company match
    { companyName: { contains: trimmed, mode: 'insensitive' } },
    // 3. Category match
    { jobCategory: { contains: trimmed, mode: 'insensitive' } },
    // 4. Location match (e.g. searching "Cairo" or "Alexandria")
    { locationNormalized: { contains: trimmed, mode: 'insensitive' } },
  ];

  // 5. Multi-word Title Coverage:
  // If user searches "Data Scientist" or "Senior Frontend", match titles containing all query words
  if (words.length > 1) {
    orConditions.push({
      AND: words.map(w => ({
        OR: [
          { titleRaw: { contains: w, mode: 'insensitive' } },
          { titleNormalized: { contains: w, mode: 'insensitive' } },
        ]
      }))
    });
  }

  // 6. Skill match (Exact or high-confidence matching)
  orConditions.push({
    skills: {
      some: {
        skill: {
          OR: [
            { name: { equals: trimmed, mode: 'insensitive' } },
            { name: { startsWith: trimmed, mode: 'insensitive' } },
            { name: { contains: trimmed, mode: 'insensitive' } }
          ]
        }
      }
    }
  });

  return { OR: orConditions };
}
