#!/usr/bin/env python3
"""
validate_skill_registry.py - Egypt Career Map (Hire Q)
Non-destructive structural validator for the Agent Skills Registry, Agent Mapping,
and SKILL.md frontmatter integrity.

Enforces:
- Schema conformance and strict data type validation of registry.yaml and agent-skill-mapping.yaml.
- Safe path resolution: strictly forbids Path Traversal ('..'), absolute paths, or escaping project root.
- Version unification: validates that registry and mapping declare version 1.1.0.
- External skill provenance: ensures external skills pin a concrete source_commit SHA.
- Status enum verification: ensures skill status is ACTIVE, EXPERIMENTAL, or DEPRECATED.
- Existence of all skill directories and valid SKILL.md files.
- Consistency between SKILL.md frontmatter 'name' and registry ID.
- Referential integrity: all mapped skills must exist in registry.yaml.
- Advanced glob collision detection: detects overlapping write scopes between agent roles.
- Auditor roles (QA, Security Auditor, Release Auditor) are strictly READ-ONLY (allowed_paths: []).
"""

import os
import sys
import re
import fnmatch
from pathlib import Path
from typing import Dict, List, Set, Tuple, Any
import yaml

ALLOWED_STATUSES = {"ACTIVE", "EXPERIMENTAL", "DEPRECATED"}
EXPECTED_GOVERNANCE_VERSION = "1.1.0"

def is_safe_relative_path(path_str: str, base_dir: Path) -> Tuple[bool, str]:
    """
    Validates that a relative path does not escape the repository boundary,
    contains no parent traversal ('..'), and is not an absolute path.
    """
    if not isinstance(path_str, str) or not path_str.strip():
        return False, "Path must be a non-empty string"
    
    clean_p = path_str.replace("\\", "/")
    
    # Check for absolute path indicators (Unix / or Windows drive C:)
    if clean_p.startswith("/") or re.match(r"^[a-zA-Z]:", clean_p):
        return False, f"Absolute paths are forbidden: '{path_str}'"
    
    # Check for parent traversal
    parts = [p for p in clean_p.split("/") if p]
    if ".." in parts:
        return False, f"Parent traversal ('..') is strictly forbidden: '{path_str}'"
    
    # Strip trailing glob patterns to test base directory resolution
    check_p = clean_p.rstrip("/*").rstrip("/**")
    if not check_p:
        return True, ""
    
    try:
        resolved = (base_dir / check_p).resolve()
        base_resolved = base_dir.resolve()
        if not resolved.is_relative_to(base_resolved):
            return False, f"Path escapes repository root: '{path_str}'"
    except Exception as e:
        return False, f"Path resolution failed: {e}"
        
    return True, ""

def globs_intersect(p1_str: str, p2_str: str) -> bool:
    """
    Determines if two glob patterns can match at least one common path.
    Handles:
      - Prefix/directory subsumption (e.g., 'src/*' subsumes 'src/api/*')
      - Recursive wildcards ('**') matching zero or more path segments
      - Single wildcards ('*') matching single path segments
      - Literal segment matching and partial wildcards ('*.ts')
    """
    s1 = [seg for seg in p1_str.replace("\\", "/").strip("/").split("/") if seg]
    s2 = [seg for seg in p2_str.replace("\\", "/").strip("/").split("/") if seg]
    
    # Check parent-child subsumption (e.g. 'a/b/*' subsumes 'a/b/c/*')
    if p1_str.endswith("/*") or p1_str.endswith("/**"):
        base1 = [seg for seg in p1_str.replace("\\", "/").rstrip("/*").split("/") if seg]
        if len(s2) >= len(base1):
            if all(b == "*" or b == "**" or b == s2[idx] or fnmatch.fnmatch(s2[idx], b) for idx, b in enumerate(base1)):
                return True
                
    if p2_str.endswith("/*") or p2_str.endswith("/**"):
        base2 = [seg for seg in p2_str.replace("\\", "/").rstrip("/*").split("/") if seg]
        if len(s1) >= len(base2):
            if all(b == "*" or b == "**" or b == s1[idx] or fnmatch.fnmatch(s1[idx], b) for idx, b in enumerate(base2)):
                return True

    memo = {}
    def helper(i: int, j: int) -> bool:
        state = (i, j)
        if state in memo:
            return memo[state]
            
        if i == len(s1) and j == len(s2):
            return True
            
        if i < len(s1) and s1[i] == "**":
            if helper(i + 1, j):
                memo[state] = True
                return True
            if j < len(s2) and helper(i, j + 1):
                memo[state] = True
                return True
            memo[state] = False
            return False
            
        if j < len(s2) and s2[j] == "**":
            if helper(i, j + 1):
                memo[state] = True
                return True
            if i < len(s1) and helper(i + 1, j):
                memo[state] = True
                return True
            memo[state] = False
            return False
            
        if i == len(s1) or j == len(s2):
            memo[state] = False
            return False
            
        seg1, seg2 = s1[i], s2[j]
        if seg1 == "*" or seg2 == "*" or seg1 == seg2 or fnmatch.fnmatch(seg1, seg2) or fnmatch.fnmatch(seg2, seg1):
            res = helper(i + 1, j + 1)
            memo[state] = res
            return res
            
        memo[state] = False
        return False

    return helper(0, 0)

def validate_registry_and_mapping(repo_root: Path) -> Tuple[List[str], List[str]]:
    agents_dir = repo_root / ".agents"
    skills_dir = agents_dir / "skills"
    rules_dir = agents_dir / "rules"
    
    registry_file = skills_dir / "registry.yaml"
    mapping_file = skills_dir / "agent-skill-mapping.yaml"
    standard_file = repo_root / "EGYPT_CAREER_MAP_AGENT_SKILLS_STANDARD.md"
    agents_pointer = repo_root / "AGENTS.md"
    governance_rule = rules_dir / "agent-skills-governance.md"
    slash_policy = skills_dir / "slash-command-policy.md"

    errors = []
    warnings = []

    print("==============================================================================")
    print("  EGYPT CAREER MAP — AGENT SKILLS ECOSYSTEM VALIDATOR")
    print(f"  Target Repository: {repo_root}")
    print("==============================================================================\n")

    # 1. Verify Core Documentation and Governance Files
    core_files = [
        ("Canonical Standard", standard_file),
        ("Root AGENTS.md Pointer", agents_pointer),
        ("Governance Rule", governance_rule),
        ("Slash-Command Policy", slash_policy),
        ("Skills Registry", registry_file),
        ("Agent Mapping", mapping_file)
    ]

    for label, path in core_files:
        if not path.is_file():
            errors.append(f"MISSING CORE FILE: {label} not found at: {path}")
        else:
            print(f"  [+] Found {label}: {path.relative_to(repo_root)}")

    if errors:
        return errors, warnings

    # 2. Parse and Validate registry.yaml
    print("\n--- Validating registry.yaml ---")
    try:
        with open(registry_file, "r", encoding="utf-8") as f:
            registry_data = yaml.safe_load(f)
    except Exception as e:
        errors.append(f"YAML Syntax Error in {registry_file.name}: {e}")
        return errors, warnings

    if not isinstance(registry_data, dict):
        errors.append("SCHEMA ERROR: registry.yaml root must be a YAML dictionary")
        return errors, warnings

    # Version check
    reg_version = str(registry_data.get("version", "")).strip()
    if reg_version != EXPECTED_GOVERNANCE_VERSION:
        errors.append(f"VERSION MISMATCH: registry.yaml version '{reg_version}' does not match expected '{EXPECTED_GOVERNANCE_VERSION}'")

    if "skills" not in registry_data or not isinstance(registry_data["skills"], list):
        errors.append("SCHEMA ERROR: registry.yaml missing top-level 'skills' list")
        return errors, warnings

    registered_skills = registry_data["skills"]
    if len(registered_skills) == 0:
        errors.append("SCHEMA ERROR: registry.yaml 'skills' list must not be empty")

    registered_ids = set()
    required_registry_fields = [
        "id", "name", "path", "domain", "purpose", "triggers",
        "status", "source_type", "license", "owner_role", "security_review"
    ]

    for idx, skill in enumerate(registered_skills):
        if not isinstance(skill, dict):
            errors.append(f"SCHEMA ERROR: Skill entry #{idx} in registry.yaml must be a dictionary")
            continue

        skill_id = skill.get("id")
        if not skill_id or not isinstance(skill_id, str):
            errors.append(f"SCHEMA ERROR: Skill entry #{idx} in registry.yaml is missing valid string 'id'")
            continue

        if skill_id in registered_ids:
            errors.append(f"DUPLICATE SKILL ID in registry: '{skill_id}'")
        registered_ids.add(skill_id)

        # Check required fields
        for field in required_registry_fields:
            if field not in skill or skill[field] is None:
                errors.append(f"Skill '{skill_id}' missing required registry field '{field}'")

        # Validate status enum
        status = skill.get("status")
        if status not in ALLOWED_STATUSES:
            errors.append(f"INVALID STATUS: Skill '{skill_id}' status '{status}' not in {sorted(list(ALLOWED_STATUSES))}")

        # Validate external skill provenance
        source_type = skill.get("source_type")
        if source_type == "external":
            source_commit = skill.get("source_commit")
            if not source_commit or not isinstance(source_commit, str) or len(source_commit.strip()) < 7:
                errors.append(f"PROVENANCE ERROR: External skill '{skill_id}' must pin a concrete 'source_commit' SHA (got: {source_commit})")

        # Verify safe physical path
        skill_rel_path = skill.get("path", "")
        is_safe, reason = is_safe_relative_path(skill_rel_path, repo_root)
        if not is_safe:
            errors.append(f"PATH TRAVERSAL ERROR: Skill '{skill_id}' has unsafe path '{skill_rel_path}': {reason}")
            continue

        skill_abs_path = (repo_root / skill_rel_path).resolve()
        if not skill_abs_path.is_dir():
            errors.append(f"Skill '{skill_id}' declared path does not exist on disk: {skill_abs_path}")
        else:
            skill_md_path = skill_abs_path / "SKILL.md"
            if not skill_md_path.is_file():
                errors.append(f"Skill '{skill_id}' missing SKILL.md at: {skill_md_path}")
            else:
                try:
                    with open(skill_md_path, "r", encoding="utf-8") as sm:
                        content = sm.read()
                    
                    fm_match = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
                    if not fm_match:
                        errors.append(f"Skill '{skill_id}' SKILL.md missing valid YAML frontmatter (---)")
                    else:
                        fm = yaml.safe_load(fm_match.group(1))
                        if not isinstance(fm, dict):
                            errors.append(f"Skill '{skill_id}' SKILL.md frontmatter must be a dictionary")
                        else:
                            fm_name = fm.get("name")
                            fm_desc = fm.get("description")
                            if not fm_name:
                                errors.append(f"Skill '{skill_id}' frontmatter missing 'name'")
                            elif fm_name != skill_id and fm_name != skill.get("name"):
                                errors.append(f"Skill '{skill_id}' frontmatter name '{fm_name}' does not match registry ID '{skill_id}'")
                            
                            if not fm_desc or len(str(fm_desc).strip()) < 10:
                                errors.append(f"Skill '{skill_id}' frontmatter missing or too short 'description'")
                except Exception as ex:
                    errors.append(f"Error reading SKILL.md for '{skill_id}': {ex}")

    # Check for skills on disk that are NOT registered
    for item in skills_dir.iterdir():
        if item.is_dir() and (item / "SKILL.md").is_file():
            if item.name not in registered_ids:
                warnings.append(f"UNREGISTERED SKILL ON DISK: Folder '{item.name}' contains a SKILL.md but is not in registry.yaml")

    print(f"  [+] Validated {len(registered_ids)} registered skills in registry.yaml")

    # 3. Parse and Validate agent-skill-mapping.yaml
    print("\n--- Validating agent-skill-mapping.yaml ---")
    try:
        with open(mapping_file, "r", encoding="utf-8") as f:
            mapping_data = yaml.safe_load(f)
    except Exception as e:
        errors.append(f"YAML Syntax Error in {mapping_file.name}: {e}")
        return errors, warnings

    if not isinstance(mapping_data, dict):
        errors.append("SCHEMA ERROR: agent-skill-mapping.yaml root must be a YAML dictionary")
        return errors, warnings

    map_version = str(mapping_data.get("version", "")).strip()
    if map_version != EXPECTED_GOVERNANCE_VERSION:
        errors.append(f"VERSION MISMATCH: agent-skill-mapping.yaml version '{map_version}' does not match expected '{EXPECTED_GOVERNANCE_VERSION}'")

    if "agents" not in mapping_data or not isinstance(mapping_data["agents"], list):
        errors.append("SCHEMA ERROR: agent-skill-mapping.yaml missing top-level 'agents' list")
        return errors, warnings

    mapped_agents = mapping_data["agents"]
    if len(mapped_agents) == 0:
        errors.append("SCHEMA ERROR: agent-skill-mapping.yaml 'agents' list must not be empty")

    mapped_roles = set()
    referenced_skills = set()
    role_write_paths: Dict[str, List[str]] = {}

    for idx, agent in enumerate(mapped_agents):
        if not isinstance(agent, dict):
            errors.append(f"SCHEMA ERROR: Agent entry #{idx} in agent-skill-mapping.yaml must be a dictionary")
            continue

        role = agent.get("role")
        if not role or not isinstance(role, str):
            errors.append(f"SCHEMA ERROR: Agent entry #{idx} in agent-skill-mapping.yaml is missing valid string 'role'")
            continue

        if role in mapped_roles:
            errors.append(f"DUPLICATE AGENT ROLE in mapping: '{role}'")
        mapped_roles.add(role)

        req_skills = agent.get("required_skills", [])
        opt_skills = agent.get("optional_skills", [])
        rst_skills = agent.get("restricted_skills", [])

        if not isinstance(req_skills, list) or len(req_skills) == 0:
            errors.append(f"Agent '{role}' must have at least one required skill (must be a non-empty list)")

        if not isinstance(opt_skills, list):
            errors.append(f"Agent '{role}' optional_skills must be a list")
            opt_skills = []

        if not isinstance(rst_skills, list):
            errors.append(f"Agent '{role}' restricted_skills must be a list")
            rst_skills = []

        for s in req_skills:
            referenced_skills.add(s)
            if s not in registered_ids:
                errors.append(f"Agent '{role}' requires unknown skill '{s}' (not in registry.yaml)")

        for s in opt_skills:
            referenced_skills.add(s)
            if s not in registered_ids:
                errors.append(f"Agent '{role}' lists unknown optional skill '{s}' (not in registry.yaml)")

        for s in rst_skills:
            if s not in registered_ids:
                errors.append(f"Agent '{role}' lists unknown restricted skill '{s}' (not in registry.yaml)")

        write_own = agent.get("write_ownership")
        if not isinstance(write_own, dict):
            errors.append(f"SCHEMA ERROR: Agent '{role}' missing 'write_ownership' dictionary")
            continue

        allowed = write_own.get("allowed_paths", None)
        if allowed is None or not isinstance(allowed, list):
            errors.append(f"Agent '{role}' missing write_ownership.allowed_paths (must be a list, empty if read-only)")
        else:
            # Validate each allowed path
            for p in allowed:
                is_safe, reason = is_safe_relative_path(p, repo_root)
                if not is_safe:
                    errors.append(f"PATH TRAVERSAL ERROR: Role '{role}' has unsafe allowed_path '{p}': {reason}")
            
            role_write_paths[role] = allowed
            
            # Check Auditor independence (Finding A & C): Auditor roles must have empty allowed_paths
            if any(auditor_term in role.lower() for auditor_term in ["auditor", "independent qa", "reviewer"]) and role != "Lead Orchestrator / Integrator":
                if len(allowed) > 0:
                    errors.append(f"AUDITOR INDEPENDENCE VIOLATION: Role '{role}' is an auditing/review role but has non-empty write_ownership.allowed_paths: {allowed}")

    # Check for overlapping write scopes between distinct roles using advanced glob intersection
    roles = list(role_write_paths.keys())
    for i in range(len(roles)):
        for j in range(i + 1, len(roles)):
            r1, r2 = roles[i], roles[j]
            paths1 = role_write_paths[r1]
            paths2 = role_write_paths[r2]
            for p1 in paths1:
                for p2 in paths2:
                    if globs_intersect(p1, p2):
                        errors.append(f"WRITE SCOPE COLLISION: Role '{r1}' ({p1}) overlaps with Role '{r2}' ({p2})")

    print(f"  [+] Validated {len(mapped_roles)} agent roles in agent-skill-mapping.yaml")

    # 4. Check for Orphaned Skills
    orphaned = registered_ids - referenced_skills
    if orphaned:
        warnings.append(f"ORPHANED SKILLS (registered but not assigned to any agent): {sorted(list(orphaned))}")

    return errors, warnings

def main():
    repo_root = Path(__file__).resolve().parent.parent.parent
    errors, warnings = validate_registry_and_mapping(repo_root)

    print("\n==============================================================================")
    print("  VALIDATION SUMMARY")
    print("==============================================================================")
    print(f"  Total Errors Detected:   {len(errors)}")
    print(f"  Total Warnings:          {len(warnings)}")
    print("------------------------------------------------------------------------------")

    if warnings:
        print("\nWARNINGS:")
        for w in warnings:
            print(f"  [!] {w}")

    if errors:
        print("\nERRORS DETECTED:")
        for err in errors:
            print(f"  [-] {err}")
        print("\nSTATUS: FAILED (Exit Code 1)\n")
        sys.exit(1)
    else:
        print("\nSTATUS: SUCCESS (All Registry & Mapping Checks Passed! Exit Code 0)\n")
        sys.exit(0)

if __name__ == "__main__":
    main()
