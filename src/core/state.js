let __packIdSeq = 0;

export function generatePackId() {
    return `pack_${Date.now()}_${__packIdSeq++}`;
}

export const state = {
    uploadedFiles: [],
    processedAddons: {
        behaviorPacks: [],
        resourcePacks: [],
        unknownPacks: []
    },
    activationState: {
        behaviorPacks: {},
        resourcePacks: {},
        unknownPacks: {}
    },
    worldMode: false,
    worldData: null,
    uiFeedback: {
        dedupe: null
    },
    duplicateSelection: {},
    _cache: {
        decompressedFiles: new Map(),
        lastCleanup: Date.now()
    }
};

export function resetProcessedAddons() {
    state.processedAddons = {
        behaviorPacks: [],
        resourcePacks: [],
        unknownPacks: []
    };
    state.activationState = {
        behaviorPacks: {},
        resourcePacks: {},
        unknownPacks: {}
    };
}

export function clearState() {
    state.uploadedFiles = [];
    resetProcessedAddons();
    state.worldMode = false;
    state.worldData = null;
    state.uiFeedback = { dedupe: null };
    state.duplicateSelection = {};
}
