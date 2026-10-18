import re

# 1. Update map/page.tsx
page_file = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\app\map\page.tsx'
with open(page_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Add states
new_states = """  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<string[]>([]);
  const [selectedExperienceLevels, setSelectedExperienceLevels] = useState<string[]>([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  
  // New States
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedEducationLevels, setSelectedEducationLevels] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState<number | null>(null);

  const handleSourceChange = (src: string, checked: boolean) => {
    if (checked) setSelectedSources((prev) => [...prev, src]);
    else setSelectedSources((prev) => prev.filter((s) => s !== src));
  };
  
  const handleEducationChange = (lvl: string, checked: boolean) => {
    if (checked) setSelectedEducationLevels((prev) => [...prev, lvl]);
    else setSelectedEducationLevels((prev) => prev.filter((l) => l !== lvl));
  };
"""
content = re.sub(
    r'const \[selectedLocations.*?useState<string\[\]>\(\[\]\);',
    new_states,
    content,
    flags=re.DOTALL
)

clear_all = """  const handleClearAll = () => {
    setSelectedLocations([]);
    setSelectedWorkTypes([]);
    setSelectedExperienceLevels([]);
    setSelectedJobTypes([]);
    setSelectedSources([]);
    setSelectedEducationLevels([]);
    setSalaryMin(null);
    setSearchQuery("");
  };"""
content = re.sub(
    r'const handleClearAll.*?setSearchQuery\(""\);\s*\n\s*\};',
    clear_all,
    content,
    flags=re.DOTALL
)

panel_props = """                <FilterPanel 
                  selectedLocations={selectedLocations}
                  selectedWorkTypes={selectedWorkTypes}
                  selectedExperienceLevels={selectedExperienceLevels}
                  selectedJobTypes={selectedJobTypes}
                  selectedSources={selectedSources}
                  selectedEducationLevels={selectedEducationLevels}
                  salaryMin={salaryMin}
                  onLocationChange={handleLocationFilterChange}
                  onWorkTypeChange={handleWorkTypeChange}
                  onExperienceLevelChange={handleExperienceChange}
                  onJobTypeChange={handleJobTypeChange}
                  onSourceChange={handleSourceChange}
                  onEducationLevelChange={handleEducationChange}
                  onSalaryMinChange={setSalaryMin}
                  onClearAll={handleClearAll}
                />"""
content = re.sub(
    r'<FilterPanel.*?</FilterPanel>',
    panel_props.replace('<FilterPanel', '<FilterPanel').replace('</FilterPanel>', ''), # Regex can be tricky with HTML, use simple replace
    content,
    flags=re.DOTALL
)
# Actually let's use string replace for panel to be safe
content = content.replace(
    """<FilterPanel 
                  selectedLocations={selectedLocations}
                  selectedWorkTypes={selectedWorkTypes}
                  selectedExperienceLevels={selectedExperienceLevels}
                  selectedJobTypes={selectedJobTypes}
                  onLocationChange={handleLocationFilterChange}
                  onWorkTypeChange={handleWorkTypeChange}
                  onExperienceLevelChange={handleExperienceChange}
                  onJobTypeChange={handleJobTypeChange}
                  onClearAll={handleClearAll}
                />""",
    panel_props
)

jobfeed_props = """          <JobFeed 
            onJobHover={setHighlightedLocation} 
            onJobClick={setHighlightedLocation} 
            searchQuery={debouncedSearchQuery}
            locations={selectedLocations}
            workTypes={selectedWorkTypes}
            experienceLevels={selectedExperienceLevels}
            jobTypes={selectedJobTypes}
            sources={selectedSources}
            educationLevels={selectedEducationLevels}
            salaryMin={salaryMin}
          />"""
content = re.sub(
    r'<JobFeed.*?\/>',
    jobfeed_props,
    content,
    flags=re.DOTALL
)

with open(page_file, 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update JobFeed.tsx
feed_file = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\components\JobFeed.tsx'
with open(feed_file, 'r', encoding='utf-8') as f:
    content = f.read()

props_interface = """interface JobFeedProps {
  onJobHover?: (location: string | null) => void;
  onJobClick?: (location: string) => void;
  searchQuery?: string;
  locations?: string[];
  workTypes?: string[];
  experienceLevels?: string[];
  jobTypes?: string[];
  sources?: string[];
  educationLevels?: string[];
  salaryMin?: number | null;
}"""
content = re.sub(
    r'interface JobFeedProps \{.*?\}',
    props_interface,
    content,
    flags=re.DOTALL
)

props_destruct = """export default function JobFeed({ 
  onJobHover, 
  onJobClick, 
  searchQuery = "",
  locations = [],
  workTypes = [],
  experienceLevels = [],
  jobTypes = [],
  sources = [],
  educationLevels = [],
  salaryMin = null
}: JobFeedProps) {"""
content = re.sub(
    r'export default function JobFeed.*?JobFeedProps\) \{',
    props_destruct,
    content,
    flags=re.DOTALL
)

query_params = """      if (searchQuery) url.searchParams.append("q", searchQuery);
      if (locations.length > 0) url.searchParams.append("locations", locations.join(","));
      if (workTypes.length > 0) url.searchParams.append("workTypes", workTypes.join(","));
      if (experienceLevels.length > 0) url.searchParams.append("experienceLevels", experienceLevels.join(","));
      if (jobTypes.length > 0) url.searchParams.append("jobTypes", jobTypes.join(","));
      if (sources.length > 0) url.searchParams.append("sources", sources.join(","));
      if (educationLevels.length > 0) url.searchParams.append("educationLevels", educationLevels.join(","));
      if (salaryMin !== null) url.searchParams.append("salaryMin", salaryMin.toString());"""
content = re.sub(
    r'if \(searchQuery\).*?if \(jobTypes\.length > 0\).*?;',
    query_params,
    content,
    flags=re.DOTALL
)

deps = "[page, searchQuery, locations, workTypes, experienceLevels, jobTypes, sources, educationLevels, salaryMin]"
content = re.sub(
    r'\[page, searchQuery, locations, workTypes, experienceLevels, jobTypes\]',
    deps,
    content
)

with open(feed_file, 'w', encoding='utf-8') as f:
    f.write(content)

# 3. Update route.ts
route_file = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\app\api\jobs\route.ts'
with open(route_file, 'r', encoding='utf-8') as f:
    content = f.read()

get_params = """    const q = searchParams.get("q");
    const locations = searchParams.get("locations");
    const workTypes = searchParams.get("workTypes");
    const experienceLevels = searchParams.get("experienceLevels");
    const jobTypes = searchParams.get("jobTypes");
    const sources = searchParams.get("sources");
    const educationLevels = searchParams.get("educationLevels");
    const salaryMin = searchParams.get("salaryMin");"""
content = re.sub(
    r'const q = searchParams.*?const jobTypes = searchParams.get\("jobTypes"\);.*?// comma separated',
    get_params,
    content,
    flags=re.DOTALL
)

new_filters = """    if (jobTypes) {
      const jtList = jobTypes.split(",").map(jt => jt.trim());
      AND.push({
        OR: jtList.map(jt => ({ jobType: { contains: jt, mode: "insensitive" } }))
      });
    }

    if (sources) {
      const sList = sources.split(",").map(s => s.trim());
      AND.push({
        OR: sList.map(s => ({ source: { equals: s, mode: "insensitive" } }))
      });
    }

    if (educationLevels) {
      const eList = educationLevels.split(",").map(e => e.trim());
      AND.push({
        OR: eList.map(e => ({ educationLevel: { contains: e, mode: "insensitive" } }))
      });
    }

    if (salaryMin) {
      const min = parseInt(salaryMin, 10);
      if (!isNaN(min)) {
        AND.push({
          salaryMin: { gte: min }
        });
      }
    }"""
content = re.sub(
    r'if \(jobTypes\) \{.*?\}\n\s*\}',
    new_filters,
    content,
    flags=re.DOTALL
)

with open(route_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Wiring done")
