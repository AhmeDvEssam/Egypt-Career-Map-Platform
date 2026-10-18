SELECT 
    j.id AS job_id,
    j.title_normalized AS job_title,
    s.id AS skill_id,
    s.name AS skill_name,
    s.category AS skill_category,
    js.skill_level,
    js.confidence,
    js.extracted_from
FROM jobs j
JOIN job_skills js ON j.id = js.job_id
JOIN skills s ON js.skill_id = s.id
ORDER BY j.created_at DESC
LIMIT 50;
