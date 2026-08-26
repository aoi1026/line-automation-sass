import { describe, expect, it } from "vitest";
import { AUTOMATION_KINDS, DEFAULT_TEMPLATES, TEMPLATE_PLACEHOLDERS } from "@/lib/constants";

/** renderTemplate と同じ規則で本文中のプレースホルダーを抽出する */
function extractPlaceholders(content: string): string[] {
  const keys: string[] = [];
  for (const match of content.matchAll(/\{([^{}\n]+)\}/g)) {
    keys.push(match[1]);
  }
  return keys;
}

describe("DEFAULT_TEMPLATES", () => {
  const validKeys = new Set(TEMPLATE_PLACEHOLDERS.map((p) => p.key));

  it("各テンプレートのプレースホルダーはすべて TEMPLATE_PLACEHOLDERS に定義済み", () => {
    for (const template of DEFAULT_TEMPLATES) {
      const used = extractPlaceholders(template.content);
      for (const key of used) {
        expect(validKeys, `${template.name} の {${key}} が未定義です`).toContain(key);
      }
    }
  });

  it("各テンプレートは少なくとも1つのプレースホルダーを含む", () => {
    for (const template of DEFAULT_TEMPLATES) {
      expect(extractPlaceholders(template.content).length).toBeGreaterThan(0);
    }
  });

  it("本文・名前が空のテンプレートは無い", () => {
    for (const template of DEFAULT_TEMPLATES) {
      expect(template.name.length).toBeGreaterThan(0);
      expect(template.content.trim().length).toBeGreaterThan(0);
    }
  });

  it("kind は自動配信対象の種別に含まれる", () => {
    for (const template of DEFAULT_TEMPLATES) {
      expect(AUTOMATION_KINDS).toContain(template.kind);
    }
  });
});

describe("TEMPLATE_PLACEHOLDERS", () => {
  it("キーに重複が無い", () => {
    const keys = TEMPLATE_PLACEHOLDERS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("キーは波括弧・改行を含まない（renderTemplate で置換可能な形式）", () => {
    for (const p of TEMPLATE_PLACEHOLDERS) {
      expect(p.key).toMatch(/^[^{}\n]+$/);
    }
  });
});
