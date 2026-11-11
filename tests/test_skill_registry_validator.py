#!/usr/bin/env python3
"""
test_skill_registry_validator.py - Adversarial Unit Tests for validate_skill_registry.py
Verifies that the validator accurately catches deliberate corruptions, missing files,
duplicate IDs, mapping collisions, auditor independence violations, path traversal attempts,
invalid schema types, invalid statuses, and missing provenance commits.
"""

import unittest
import tempfile
import shutil
from pathlib import Path
import yaml
import sys

# Import validator logic
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / ".agents" / "scripts"))
from validate_skill_registry import validate_registry_and_mapping, is_safe_relative_path, globs_intersect

class TestSkillRegistryValidatorAdversarial(unittest.TestCase):
    def setUp(self):
        # Create an isolated temporary test repository fixture
        self.test_dir = tempfile.mkdtemp(prefix="test_repo_skills_")
        self.repo_root = Path(self.test_dir)
        
        # Structure core directories
        self.agents_dir = self.repo_root / ".agents"
        self.skills_dir = self.agents_dir / "skills"
        self.rules_dir = self.agents_dir / "rules"
        self.skills_dir.mkdir(parents=True)
        self.rules_dir.mkdir(parents=True)

        # Create core files
        (self.repo_root / "EGYPT_CAREER_MAP_AGENT_SKILLS_STANDARD.md").write_text("# Standard", encoding="utf-8")
        (self.repo_root / "AGENTS.md").write_text("# Pointer", encoding="utf-8")
        (self.rules_dir / "agent-skills-governance.md").write_text("# Rule", encoding="utf-8")
        (self.skills_dir / "slash-command-policy.md").write_text("# Slash", encoding="utf-8")

        # Create 1 valid skill fixture
        self.valid_skill_dir = self.skills_dir / "test-skill-alpha"
        self.valid_skill_dir.mkdir()
        (self.valid_skill_dir / "SKILL.md").write_text(
            "---\nname: test-skill-alpha\ndescription: Valid test skill description with adequate length.\n---\n# Test",
            encoding="utf-8"
        )

        # Baseline valid registry.yaml (v1.1.0)
        self.base_registry = {
            "version": "1.1.0",
            "skills": [
                {
                    "id": "test-skill-alpha",
                    "name": "test-skill-alpha",
                    "path": ".agents/skills/test-skill-alpha",
                    "domain": "Testing",
                    "purpose": "A valid test skill",
                    "triggers": ["test trigger"],
                    "status": "ACTIVE",
                    "source_type": "project_authored",
                    "license": "MIT",
                    "owner_role": "Test Engineer",
                    "security_review": "passed"
                }
            ]
        }
        (self.skills_dir / "registry.yaml").write_text(yaml.dump(self.base_registry), encoding="utf-8")

        # Baseline valid agent-skill-mapping.yaml (v1.1.0)
        self.base_mapping = {
            "version": "1.1.0",
            "agents": [
                {
                    "role": "Test Engineer",
                    "required_skills": ["test-skill-alpha"],
                    "optional_skills": [],
                    "restricted_skills": [],
                    "write_ownership": {
                        "allowed_paths": ["tests/*"]
                    }
                },
                {
                    "role": "Independent QA Reviewer",
                    "required_skills": ["test-skill-alpha"],
                    "optional_skills": [],
                    "restricted_skills": [],
                    "write_ownership": {
                        "allowed_paths": []  # Strictly read-only
                    }
                }
            ]
        }
        (self.skills_dir / "agent-skill-mapping.yaml").write_text(yaml.dump(self.base_mapping), encoding="utf-8")

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_01_baseline_passes(self):
        """Baseline repository fixture must pass with 0 errors."""
        errors, warnings = validate_registry_and_mapping(self.repo_root)
        self.assertEqual(len(errors), 0, f"Expected 0 errors, got: {errors}")

    def test_02_missing_skill_directory_fails(self):
        """Case: Skill registered in registry.yaml but folder/SKILL.md deleted."""
        shutil.rmtree(self.valid_skill_dir)
        errors, _ = validate_registry_and_mapping(self.repo_root)
        self.assertTrue(any("does not exist on disk" in err for err in errors), f"Errors: {errors}")

    def test_03_unregistered_skill_folder_warns(self):
        """Case: Skill folder exists on disk with SKILL.md but not listed in registry.yaml."""
        orphan_dir = self.skills_dir / "orphan-skill"
        orphan_dir.mkdir()
        (orphan_dir / "SKILL.md").write_text("---\nname: orphan\ndescription: An unlisted skill.\n---\n", encoding="utf-8")
        
        _, warnings = validate_registry_and_mapping(self.repo_root)
        self.assertTrue(any("UNREGISTERED SKILL ON DISK" in w for w in warnings), f"Warnings: {warnings}")

    def test_04_agent_mapping_unknown_skill_fails(self):
        """Case: Agent mapping references a skill ID that does not exist in registry."""
        bad_mapping = dict(self.base_mapping)
        bad_mapping["agents"][0]["required_skills"] = ["non-existent-skill-id"]
        (self.skills_dir / "agent-skill-mapping.yaml").write_text(yaml.dump(bad_mapping), encoding="utf-8")

        errors, _ = validate_registry_and_mapping(self.repo_root)
        self.assertTrue(any("requires unknown skill 'non-existent-skill-id'" in err for err in errors), f"Errors: {errors}")

    def test_05_duplicate_skill_id_fails(self):
        """Case: registry.yaml contains duplicate skill IDs."""
        dup_registry = dict(self.base_registry)
        dup_registry["skills"].append(dup_registry["skills"][0])  # Duplicate entry
        (self.skills_dir / "registry.yaml").write_text(yaml.dump(dup_registry), encoding="utf-8")

        errors, _ = validate_registry_and_mapping(self.repo_root)
        self.assertTrue(any("DUPLICATE SKILL ID" in err for err in errors), f"Errors: {errors}")

    def test_06_frontmatter_name_mismatch_fails(self):
        """Case: SKILL.md frontmatter name does not match registry ID."""
        (self.valid_skill_dir / "SKILL.md").write_text(
            "---\nname: completely-different-name\ndescription: Valid description with adequate length.\n---\n",
            encoding="utf-8"
        )
        errors, _ = validate_registry_and_mapping(self.repo_root)
        self.assertTrue(any("does not match registry ID" in err for err in errors), f"Errors: {errors}")

    def test_07_auditor_write_scope_violation_fails(self):
        """Case: An auditor role (e.g., Independent QA Reviewer) has write_ownership.allowed_paths."""
        violating_mapping = dict(self.base_mapping)
        violating_mapping["agents"][1]["write_ownership"]["allowed_paths"] = ["src/tests/*"]
        (self.skills_dir / "agent-skill-mapping.yaml").write_text(yaml.dump(violating_mapping), encoding="utf-8")

        errors, _ = validate_registry_and_mapping(self.repo_root)
        self.assertTrue(any("AUDITOR INDEPENDENCE VIOLATION" in err for err in errors), f"Errors: {errors}")

    def test_08_overlapping_write_scopes_fails(self):
        """Case: Two distinct roles have overlapping write paths (e.g. app/* and app/api/*)."""
        colliding_mapping = {
            "version": "1.1.0",
            "agents": [
                {
                    "role": "Frontend Role",
                    "required_skills": ["test-skill-alpha"],
                    "write_ownership": { "allowed_paths": ["frontend/src/app/*"] }
                },
                {
                    "role": "Backend Role",
                    "required_skills": ["test-skill-alpha"],
                    "write_ownership": { "allowed_paths": ["frontend/src/app/api/*"] }
                }
            ]
        }
        (self.skills_dir / "agent-skill-mapping.yaml").write_text(yaml.dump(colliding_mapping), encoding="utf-8")

        errors, _ = validate_registry_and_mapping(self.repo_root)
        self.assertTrue(any("WRITE SCOPE COLLISION" in err for err in errors), f"Errors: {errors}")

    def test_09_path_traversal_in_skill_path_fails(self):
        """Case: registry.yaml contains parent traversal (..) in skill path."""
        bad_reg = dict(self.base_registry)
        bad_reg["skills"][0]["path"] = "../../outside/test-skill"
        (self.skills_dir / "registry.yaml").write_text(yaml.dump(bad_reg), encoding="utf-8")

        errors, _ = validate_registry_and_mapping(self.repo_root)
        self.assertTrue(any("PATH TRAVERSAL ERROR" in err for err in errors), f"Errors: {errors}")

    def test_10_absolute_path_in_allowed_paths_fails(self):
        """Case: agent-skill-mapping.yaml contains an absolute path in write_ownership."""
        bad_map = dict(self.base_mapping)
        bad_map["agents"][0]["write_ownership"]["allowed_paths"] = ["/etc/passwd"]
        (self.skills_dir / "agent-skill-mapping.yaml").write_text(yaml.dump(bad_map), encoding="utf-8")

        errors, _ = validate_registry_and_mapping(self.repo_root)
        self.assertTrue(any("PATH TRAVERSAL ERROR" in err for err in errors), f"Errors: {errors}")

    def test_11_invalid_status_enum_fails(self):
        """Case: Skill declares an unrecognized status enum value."""
        bad_reg = dict(self.base_registry)
        bad_reg["skills"][0]["status"] = "INVALID_STATUS_VALUE"
        (self.skills_dir / "registry.yaml").write_text(yaml.dump(bad_reg), encoding="utf-8")

        errors, _ = validate_registry_and_mapping(self.repo_root)
        self.assertTrue(any("INVALID STATUS" in err for err in errors), f"Errors: {errors}")

    def test_12_malformed_yaml_fails(self):
        """Case: registry.yaml contains a YAML syntax error."""
        (self.skills_dir / "registry.yaml").write_text("skills: [unclosed_list", encoding="utf-8")
        errors, _ = validate_registry_and_mapping(self.repo_root)
        self.assertTrue(any("YAML Syntax Error" in err for err in errors), f"Errors: {errors}")

    def test_13_advanced_glob_collision_recursive_wildcard_fails(self):
        """Case: Advanced glob collision with recursive ** wildcards."""
        colliding_mapping = {
            "version": "1.1.0",
            "agents": [
                {
                    "role": "Role A",
                    "required_skills": ["test-skill-alpha"],
                    "write_ownership": { "allowed_paths": ["src/*/services/**"] }
                },
                {
                    "role": "Role B",
                    "required_skills": ["test-skill-alpha"],
                    "write_ownership": { "allowed_paths": ["src/auth/services/**"] }
                }
            ]
        }
        (self.skills_dir / "agent-skill-mapping.yaml").write_text(yaml.dump(colliding_mapping), encoding="utf-8")

        errors, _ = validate_registry_and_mapping(self.repo_root)
        self.assertTrue(any("WRITE SCOPE COLLISION" in err for err in errors), f"Errors: {errors}")

    def test_14_external_skill_missing_commit_sha_fails(self):
        """Case: External skill does not pin a concrete source_commit SHA."""
        bad_reg = dict(self.base_registry)
        bad_reg["skills"][0]["source_type"] = "external"
        bad_reg["skills"][0]["source_commit"] = ""  # Missing commit
        (self.skills_dir / "registry.yaml").write_text(yaml.dump(bad_reg), encoding="utf-8")

        errors, _ = validate_registry_and_mapping(self.repo_root)
        self.assertTrue(any("PROVENANCE ERROR" in err for err in errors), f"Errors: {errors}")

if __name__ == "__main__":
    unittest.main()
