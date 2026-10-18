from sqlalchemy import create_engine, text
from database import PG_URL

engine = create_engine(PG_URL)

trigger_sql = """
CREATE OR REPLACE FUNCTION auto_normalize_job()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Auto-Normalize Location
    IF NEW.location_raw ILIKE '%cairo%' OR NEW.location_raw ILIKE '%egypt%' THEN
        NEW.location_normalized := 'Cairo';
    ELSIF NEW.location_raw ILIKE '%giza%' OR NEW.location_raw ILIKE '%6th of october%' THEN
        NEW.location_normalized := 'Giza';
    ELSIF NEW.location_raw ILIKE '%alex%' THEN
        NEW.location_normalized := 'Alexandria';
    ELSIF NEW.location_raw ILIKE '%remote%' OR NEW.location_raw ILIKE '%anywhere%' THEN
        NEW.location_normalized := 'Remote';
    ELSIF NEW.location_raw ILIKE '%mansoura%' OR NEW.location_raw ILIKE '%dakahlia%' THEN
        NEW.location_normalized := 'Dakahlia';
    ELSE
        -- Fallback: if no location is specified or it's unknown, we default to Cairo
        IF NEW.location_raw IS NULL OR trim(NEW.location_raw) = '' THEN
            NEW.location_normalized := 'Cairo';
        ELSE
            -- We can leave it as the raw location for the few edge cases
            NEW.location_normalized := NEW.location_raw;
        END IF;
    END IF;

    -- 2. Auto-Normalize Title (If scraper didn't provide one, use raw title)
    IF NEW.title_normalized IS NULL OR trim(NEW.title_normalized) = '' THEN
        NEW.title_normalized := NEW.title_raw;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_normalize_job ON jobs;

CREATE TRIGGER trg_auto_normalize_job
BEFORE INSERT OR UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION auto_normalize_job();
"""

with engine.connect() as conn:
    print("Creating auto-normalization database triggers...")
    conn.execute(text(trigger_sql))
    conn.commit()
    print("Success! Triggers created.")
