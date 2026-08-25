import commonSource from "./common.txt?raw";
import motorcycleSource from "./motorcycle.txt?raw";
import powerSource from "./power.txt?raw";
import refrigerationSource from "./refrigeration.txt?raw";
import type { DialogueLine, Speaker } from "../../../types/game";

const SPEAKERS: Record<string, Speaker> = {
  MIRA: "mira",
  NARRATOR: "narrator",
  PLAYER: "player",
  SEOYUN: "seoyun",
};

export function parseDialogueSource(source: string): Map<string, DialogueLine[]> {
  const sections = new Map<string, DialogueLine[]>();
  let currentId: string | null = null;

  source.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;

    const sectionMatch = line.match(/^#\s+([^\s]+)$/);
    if (sectionMatch) {
      currentId = sectionMatch[1];
      if (sections.has(currentId)) {
        throw new Error(`Duplicate dialogue section "${currentId}" at line ${index + 1}.`);
      }
      sections.set(currentId, []);
      return;
    }

    if (!currentId) {
      throw new Error(`Dialogue line outside a section at line ${index + 1}.`);
    }

    const dialogueMatch = rawLine.match(/^\s*([A-Z]+):\s?(.*)$/);
    if (!dialogueMatch || dialogueMatch[2].length === 0) {
      throw new Error(`Invalid dialogue line at line ${index + 1}: "${rawLine}".`);
    }

    const speaker = SPEAKERS[dialogueMatch[1]];
    if (!speaker) {
      throw new Error(`Unknown dialogue speaker "${dialogueMatch[1]}" at line ${index + 1}.`);
    }

    sections.get(currentId)!.push({ speaker, text: dialogueMatch[2] });
  });

  return sections;
}

const dialogueSections = [
  commonSource,
  motorcycleSource,
  powerSource,
  refrigerationSource,
].reduce((allSections, source) => {
  parseDialogueSource(source).forEach((lines, id) => {
    if (allSections.has(id)) {
      throw new Error(`Duplicate dialogue section "${id}" across dialogue files.`);
    }
    allSections.set(id, lines);
  });
  return allSections;
}, new Map<string, DialogueLine[]>());

export function getDialogue(dialogueId: string): DialogueLine[] {
  const dialogue = dialogueSections.get(dialogueId);
  if (!dialogue) {
    throw new Error(`Dialogue section "${dialogueId}" was not found.`);
  }
  return dialogue;
}
