import re

file_path = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\components\JobFeed.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add useSearchParams import if missing
if 'useSearchParams' not in content:
    content = content.replace('import { useState, useEffect, useRef } from "react";', 
                              'import { useState, useEffect, useRef } from "react";\nimport { useSearchParams } from "next/navigation";')

# Remove the props we don't need
content = re.sub(r'  searchQuery\?: string;\n  locations\?: string\[\];\n  workTypes\?: string\[\];\n  experienceLevels\?: string\[\];\n  jobTypes\?: string\[\];\n  sources\?: string\[\];\n  educationLevels\?: string\[\];\n  salaryMin\?: number \| null;\n', '', content)

# Remove them from the component args
content = re.sub(r',\n  searchQuery = "",\n  locations = \[\],\n  workTypes = \[\],\n  experienceLevels = \[\],\n  jobTypes = \[\],\n  sources = \[\],\n  educationLevels = \[\],\n  salaryMin = null', '', content)

# Inside fetchJobs, we use the URL searchParams!
fetch_logic = """
  const searchParams = useSearchParams();

  const fetchJobs = (pageNum: number, isLoadMore = false) => {
    if (!isLoadMore) setLoading(true);
    else setLoadingMore(true);

    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", "50");
    params.set("page", pageNum.toString());
    params.set("_t", Date.now().toString());

    fetch(`/api/jobs?${params.toString()}`)
      .then((res) => res.json())
"""

content = re.sub(
    r'  const fetchJobs = \(pageNum: number, isLoadMore = false\) => \{.*fetch\(`/api/jobs\?\$\{params\.toString\(\)\}`\)\s*\.then\(\(res\) => res\.json\(\)\)',
    fetch_logic,
    content,
    flags=re.DOTALL
)

# Fix useEffect dependencies
content = re.sub(r'\[page, searchQuery, locations, workTypes, experienceLevels, jobTypes, sources, educationLevels, salaryMin\]', '[page, searchParams]', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("JobFeed updated")
