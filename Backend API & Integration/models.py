import uuid
from sqlalchemy import Column, String, Text, Numeric, Integer, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source = Column(String)
    source_job_id = Column(String, index=True)
    title_raw = Column(Text)
    title_normalized = Column(Text)
    company_name = Column(String)
    company_url = Column(Text)
    location_raw = Column(Text)
    location_normalized = Column(Text)
    job_type = Column(String)
    work_type = Column(String)
    career_level = Column(String)
    education_level = Column(String)
    job_category = Column(String)
    salary_min = Column(Numeric)
    salary_max = Column(Numeric)
    currency = Column(String)
    job_url = Column(Text)
    posted_date = Column(DateTime(timezone=True))
    scraped_at = Column(DateTime(timezone=True))
    status = Column(String) # e.g. Open, Closed
    source_raw = Column(JSONB)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    logo_url = Column(Text)
    applicants = Column(Integer)
    viewed = Column(Integer)
    internal_category = Column(String)
    
    # --- New AI & Intelligence Fields ---
    has_explicit_skills = Column(Boolean, default=False)
    ai_analyzed = Column(Boolean, default=False, index=True)
    
    # Relationships
    descriptions = relationship("JobDescription", back_populates="job", cascade="all, delete-orphan")
    skill_occurrences = relationship("JobSkill", back_populates="job", cascade="all, delete-orphan")


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    type = Column(String)
    content = Column(Text)
    language = Column(String)
    is_primary = Column(Boolean, default=True)
    
    job = relationship("Job", back_populates="descriptions")


class Skill(Base):
    __tablename__ = "skills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, index=True) # Canonical name
    category = Column(String, index=True)
    
    occurrences = relationship("JobSkill", back_populates="skill")
    aliases = relationship("SkillAlias", back_populates="skill", cascade="all, delete-orphan")


class SkillAlias(Base):
    __tablename__ = "skill_aliases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    skill_id = Column(UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), index=True)
    alias_name = Column(String, unique=True, nullable=False)
    
    skill = relationship("Skill", back_populates="aliases")


class JobSkill(Base):
    __tablename__ = "job_skills"

    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), primary_key=True, index=True)
    skill_id = Column(UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True, index=True)
    
    is_required = Column(Boolean, default=True)
    extracted_from = Column(String)
    
    # --- New AI Intelligence Fields ---
    skill_level = Column(String) # e.g., Beginner, Intermediate, Expert, or A, B, C
    confidence = Column(Float, default=1.0)
    source_job_id = Column(String, index=True) # Cross-reference to the original job source
    raw_skill_text = Column(String) # Original text evidence extracted by AI
    
    job = relationship("Job", back_populates="skill_occurrences")
    skill = relationship("Skill", back_populates="occurrences")
