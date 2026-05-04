import { getPresetById, segmentQuickPresets } from "./segmentBuilder.js";

export const segmentPresets = segmentQuickPresets;

export const getSegmentPreset = (presetId) => getPresetById(presetId);
