#!/usr/bin/env python3
"""Verify that the committed catalog is a complete, deterministic workbook import."""

from __future__ import annotations

import argparse
import importlib.util
import json
from collections import Counter
from pathlib import Path
from typing import Any


EXPECTED_SHEETS = [
    "整车通用",
    "左前方位",
    "左后方位",
    "右前方位",
    "右后方位",
    "三大件专项",
    "新能源专项",
    "判定总则",
]

EXPECTED_SUMMARIES = {
    "整车通用": {"validRows": 4, "checkItems": 4, "criteria": 4, "fallbackCriteria": 0},
    "左前方位": {"validRows": 41, "checkItems": 41, "criteria": 163, "fallbackCriteria": 2},
    "左后方位": {"validRows": 36, "checkItems": 36, "criteria": 146, "fallbackCriteria": 3},
    "右前方位": {"validRows": 37, "checkItems": 37, "criteria": 159, "fallbackCriteria": 2},
    "右后方位": {"validRows": 35, "checkItems": 35, "criteria": 145, "fallbackCriteria": 3},
    "三大件专项": {"validRows": 26, "checkItems": 26, "criteria": 93, "fallbackCriteria": 0},
    "新能源专项": {"validRows": 14, "checkItems": 14, "criteria": 41, "fallbackCriteria": 0},
}

EXPECTED_TOTALS = {
    "applicableSourceRows": 193,
    "checkItems": 193,
    "criteria": 751,
    "activeRules": 3,
    "excludedRows": 1,
}


def load_generator() -> Any:
    script_path = Path(__file__).with_name("generate-template-catalog.py")
    spec = importlib.util.spec_from_file_location("template_catalog_generator", script_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load generator: {script_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def flatten(definition: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    items: list[dict[str, Any]] = []
    criteria: list[dict[str, Any]] = []
    for section in definition["sections"]:
        for position in section["positions"]:
            for item in position["checkItems"]:
                items.append(item)
                criteria.extend(item["criteria"])
    return items, criteria


def assert_equal(actual: Any, expected: Any, label: str) -> None:
    if actual != expected:
        raise AssertionError(f"{label}: expected {expected!r}, got {actual!r}")


def validate(workbook_path: Path, catalog_path: Path) -> dict[str, Any]:
    generator = load_generator()
    rebuilt = generator.build_catalog(workbook_path)
    committed = json.loads(catalog_path.read_text(encoding="utf-8"))

    assert_equal(rebuilt["sourceManifest"]["sheets"], EXPECTED_SHEETS, "source sheet list")
    assert_equal(committed["sourceManifest"]["sheets"], EXPECTED_SHEETS, "committed sheet list")
    assert_equal(rebuilt["sourceManifest"]["totals"], EXPECTED_TOTALS, "workbook totals")
    assert_equal(committed["sourceManifest"]["totals"], EXPECTED_TOTALS, "committed totals")
    assert_equal(committed["sourceManifest"], rebuilt["sourceManifest"], "committed source manifest")

    rebuilt_summaries = {summary["sheet"]: summary for summary in rebuilt["sourceManifest"]["sheetSummaries"]}
    committed_summaries = {summary["sheet"]: summary for summary in committed["sourceManifest"]["sheetSummaries"]}
    for sheet, expected in EXPECTED_SUMMARIES.items():
        for field, value in expected.items():
            assert_equal(rebuilt_summaries[sheet][field], value, f"{sheet} {field} from workbook")
            assert_equal(committed_summaries[sheet][field], value, f"{sheet} {field} in catalog")

    rebuilt_items, rebuilt_criteria = flatten(rebuilt["newEnergy"])
    committed_items, committed_criteria = flatten(committed["newEnergy"])
    assert_equal(len(rebuilt_items), EXPECTED_TOTALS["checkItems"], "rebuilt item count")
    assert_equal(len(rebuilt_criteria), EXPECTED_TOTALS["criteria"], "rebuilt criterion count")
    assert_equal(len(committed_items), EXPECTED_TOTALS["checkItems"], "committed item count")
    assert_equal(len(committed_criteria), EXPECTED_TOTALS["criteria"], "committed criterion count")

    expected_item_refs = {
        (sheet, entry["row"])
        for sheet, summary in rebuilt_summaries.items()
        if sheet != "判定总则"
        for entry in summary["sourceCriteria"]
    }
    actual_item_refs = {(item["sourceSheet"], item["sourceRow"]) for item in rebuilt_items}
    committed_item_refs = {(item["sourceSheet"], item["sourceRow"]) for item in committed_items}
    assert_equal(len(expected_item_refs), EXPECTED_TOTALS["applicableSourceRows"], "source-row reference count")
    assert_equal(actual_item_refs, expected_item_refs, "rebuilt source-row coverage")
    assert_equal(committed_item_refs, expected_item_refs, "committed source-row coverage")
    assert_equal(Counter((item["sourceSheet"], item["sourceRow"]) for item in rebuilt_items), Counter((item["sourceSheet"], item["sourceRow"]) for item in committed_items), "committed item provenance")

    expected_criterion_refs = [
        (sheet, entry["row"], entry["column"], entry["partIndex"], entry["text"])
        for sheet, summary in rebuilt_summaries.items()
        if sheet != "判定总则"
        for entry in summary["sourceCriteria"]
    ]
    actual_criterion_refs = [
        (criterion["sourceSheet"], criterion["sourceRow"], criterion["sourceColumn"], criterion["sourcePartIndex"], criterion["sourceText"])
        for criterion in rebuilt_criteria
    ]
    committed_criterion_refs = [
        (criterion["sourceSheet"], criterion["sourceRow"], criterion["sourceColumn"], criterion["sourcePartIndex"], criterion["sourceText"])
        for criterion in committed_criteria
    ]
    assert_equal(Counter(actual_criterion_refs), Counter(expected_criterion_refs), "rebuilt criterion provenance")
    assert_equal(Counter(committed_criterion_refs), Counter(expected_criterion_refs), "committed criterion provenance")

    assert_equal(
        [(rule["code"], rule["sourceRow"]) for rule in committed["sourceManifest"]["rules"]],
        [("ACCIDENT_RULE", 2), ("FLOOD_RULE", 3), ("BOUNDARY_RULE", 5)],
        "active rule rows",
    )
    assert_equal(
        [(row["label"], row["row"]) for row in committed["sourceManifest"]["excludedRows"]],
        [("③ 火烧车", 4)],
        "excluded rule rows",
    )

    for item in committed_items:
        if not item.get("sourceSheet") or not item.get("sourceRow"):
            raise AssertionError(f"missing item provenance: {item.get('code')}")
    for criterion in committed_criteria:
        if not criterion.get("sourceSheet") or not criterion.get("sourceRow") or not criterion.get("sourceColumn"):
            raise AssertionError(f"missing criterion provenance: {criterion.get('code')}")

    result = {
        "workbook": workbook_path.name,
        "catalog": str(catalog_path),
        "totals": EXPECTED_TOTALS,
        "sheets": EXPECTED_SUMMARIES,
        "activeRules": [(rule["code"], rule["sourceRow"]) for rule in committed["sourceManifest"]["rules"]],
        "excludedRows": [(row["label"], row["row"]) for row in committed["sourceManifest"]["excludedRows"]],
    }
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workbook", required=True, type=Path)
    parser.add_argument("--catalog", required=True, type=Path)
    args = parser.parse_args()
    result = validate(args.workbook, args.catalog)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print("Template catalog validation passed.")


if __name__ == "__main__":
    main()
