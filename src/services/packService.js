import { state, generatePackId } from '../core/state.js';
import { parseManifestSafe, detectPackType } from '../parsers/manifest.js';
import { validateBedrockManifest } from '../parsers/manifestValidator.js';
import { isArchiveFile, decompressFile } from '../parsers/archive.js';
import { showToast } from '../utils/feedback.js';

export async function extractPackFromZip(zip, manifestPath, options = {}) {
    const {
        suggestedPackType = null,
        isFromWorld = false,
        fromNestedZip = false,
        originalPath = '',
        fileName = ''
    } = options;

    const manifestEntry = zip.file(manifestPath);
    if (!manifestEntry) return null;

    const rawContent = await manifestEntry.async('string');
    const folderParts = manifestPath.split('/').filter(Boolean);
    const folderName = folderParts.length > 1 ? folderParts[folderParts.length - 2] : (fileName.replace(/\.[^.]+$/, '') || 'Addon');
    
    const { manifest, isCorrupted } = parseManifestSafe(rawContent, folderName, isFromWorld);
    const addonName = manifest.header?.name || folderName || 'Unknown';
    
    let packType = detectPackType(manifest) || suggestedPackType;
    if (!packType || (packType !== 'behavior' && packType !== 'resource')) {
        packType = 'unknown';
    }

    const addonRootPath = manifestPath.substring(0, manifestPath.lastIndexOf('/') + 1);
    const addonFiles = {};
    const promises = [];

    zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
            let relativePathInAddon = null;
            if (addonRootPath && relativePath.startsWith(addonRootPath)) {
                relativePathInAddon = relativePath.substring(addonRootPath.length);
            } else if (!addonRootPath) {
                relativePathInAddon = relativePath;
            }
            if (relativePathInAddon !== null) {
                promises.push(
                    zipEntry.async('blob').then(blob => {
                        addonFiles[relativePathInAddon] = blob;
                    })
                );
            }
        }
    });

    await Promise.all(promises);

    const pathLooksWorld = /(^|\/)behavior_packs\//.test(manifestPath) || /(^|\/)resource_packs\//.test(manifestPath);
    const isWorldPack = isFromWorld || (state.worldMode && pathLooksWorld);
    const validation = validateBedrockManifest(manifest);

    const addonData = {
        _id: generatePackId(),
        name: addonName,
        files: addonFiles,
        manifest: manifest,
        validation: validation,
        originalPath: originalPath || addonRootPath,
        needsCategory: packType === 'unknown' && !isWorldPack,
        fromWorld: isWorldPack,
        fromNestedZip: fromNestedZip,
        hasCorruptedManifest: isCorrupted || Boolean(manifest.header?.description?.includes('Manifest corrompido'))
    };

    if (packType === 'behavior') {
        state.processedAddons.behaviorPacks.push(addonData);
        state.activationState.behaviorPacks[addonData._id] = true;
    } else if (packType === 'resource') {
        state.processedAddons.resourcePacks.push(addonData);
        state.activationState.resourcePacks[addonData._id] = true;
    } else {
        state.processedAddons.unknownPacks.push(addonData);
        state.activationState.unknownPacks[addonData._id] = true;
    }

    return addonData;
}

export async function processAddonFile(file) {
    try {
        const zip = await decompressFile(file);
        const fileCount = Object.keys(zip.files).length;
        if (fileCount === 0) {
            console.warn(`Arquivo ${file.name} parece estar vazio`);
            return;
        }

        const nestedArchives = [];
        const manifestFiles = [];

        zip.forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir) {
                if (isArchiveFile(zipEntry.name)) {
                    nestedArchives.push({ path: relativePath, entry: zipEntry });
                } else if (zipEntry.name.toLowerCase().endsWith('manifest.json')) {
                    manifestFiles.push({ path: relativePath, entry: zipEntry });
                }
            }
        });

        if (nestedArchives.length > 0) {
            for (const nested of nestedArchives) {
                try {
                    const nestedBlob = await nested.entry.async('blob');
                    const nestedFileName = nested.path.split('/').pop();
                    const nestedFile = new File([nestedBlob], nestedFileName, { type: 'application/zip' });
                    await processAddonFile(nestedFile);
                } catch (err) {
                    console.error(`Erro ao processar nested ${nested.path}:`, err);
                }
            }
        }

        if (manifestFiles.length > 0) {
            for (const mf of manifestFiles) {
                await extractPackFromZip(zip, mf.path, { fileName: file.name });
            }
        }
    } catch (err) {
        console.error(`Erro ao processar addon ${file.name}:`, err);
        showToast(`Erro ao processar ${file.name}: ${err.message}`, 'error');
    }
}

export function togglePackActivation(packId, packType, checked) {
    if (packType === 'behavior') {
        state.activationState.behaviorPacks[packId] = checked;
    } else if (packType === 'resource') {
        state.activationState.resourcePacks[packId] = checked;
    } else if (packType === 'unknown') {
        state.activationState.unknownPacks[packId] = checked;
    }
}

export function saveEditEssentials(packId, packType, packInternalId, uuid, versionStr) {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(uuid)) {
        showToast('UUID inválido. Use o formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'error');
        return false;
    }
    const verParts = (versionStr || '').split('.').map(n => parseInt(n, 10)).filter(n => !isNaN(n));
    if (verParts.length !== 3) {
        showToast('Versão inválida. Use o formato major.minor.patch (ex: 1.0.0)', 'error');
        return false;
    }

    const list = packType === 'behavior' ? state.processedAddons.behaviorPacks
              : packType === 'resource' ? state.processedAddons.resourcePacks
              : state.processedAddons.unknownPacks;
    const pack = list.find(p => p._id === packInternalId);
    if (!pack) {
        showToast('Pack não encontrado.', 'error');
        return false;
    }

    pack.manifest = pack.manifest || { header: {} };
    pack.manifest.header = pack.manifest.header || {};
    pack.manifest.header.uuid = uuid;
    pack.manifest.header.version = verParts;

    // Atualiza status de validação de schema
    pack.validation = validateBedrockManifest(pack.manifest);
    if (pack.validation.valid) {
        pack.hasCorruptedManifest = false;
    }

    showToast('Manifest atualizado com sucesso!', 'success');
    return true;
}

export function dedupeActivation() {
    const all = [
        ...state.processedAddons.behaviorPacks.map(p => ({ ...p, _t: 'behavior' })),
        ...state.processedAddons.resourcePacks.map(p => ({ ...p, _t: 'resource' })),
        ...state.processedAddons.unknownPacks.map(p => ({ ...p, _t: 'unknown' }))
    ];
    const groups = {};
    all.forEach(p => {
        const key = p?.manifest?.header?.uuid || `no-uuid:${p.name}`;
        groups[key] = groups[key] || [];
        groups[key].push(p);
    });

    let changed = 0;
    let groupsCount = 0;

    Object.values(groups).forEach(items => {
        if (items.length > 1) {
            groupsCount++;
            items.forEach((p, idx) => {
                const target = p._t === 'behavior' ? state.activationState.behaviorPacks
                              : p._t === 'resource' ? state.activationState.resourcePacks
                              : state.activationState.unknownPacks;
                const id = p._id;
                if (idx === 0) {
                    target[id] = true;
                } else {
                    if (target[id] !== false) changed++;
                    target[id] = false;
                }
            });
        }
    });

    state.uiFeedback = state.uiFeedback || {};
    state.uiFeedback.dedupe = { changed, groups: groupsCount, ts: Date.now() };
}

export function resolveDuplicateChoiceByIndex(groupKey, indexInGroup) {
    const all = [
        ...state.processedAddons.behaviorPacks.map(p => ({ ...p, _t: 'behavior' })),
        ...state.processedAddons.resourcePacks.map(p => ({ ...p, _t: 'resource' })),
        ...state.processedAddons.unknownPacks.map(p => ({ ...p, _t: 'unknown' }))
    ];
    const matches = all.filter(p => (p?.manifest?.header?.uuid || `no-uuid:${p.name}`) === groupKey);
    if (matches.length === 0) return;
    const idx = parseInt(indexInGroup, 10);
    if (isNaN(idx) || idx < 0 || idx >= matches.length) return;
    state.duplicateSelection[groupKey] = idx;
    matches.forEach((p, i) => {
        const target = p._t === 'behavior' ? state.activationState.behaviorPacks
                      : p._t === 'resource' ? state.activationState.resourcePacks
                      : state.activationState.unknownPacks;
        target[p._id] = (i === idx);
    });
}

export function resolveDuplicateNone(groupKey) {
    const all = [
        ...state.processedAddons.behaviorPacks.map(p => ({ ...p, _t: 'behavior' })),
        ...state.processedAddons.resourcePacks.map(p => ({ ...p, _t: 'resource' })),
        ...state.processedAddons.unknownPacks.map(p => ({ ...p, _t: 'unknown' }))
    ];
    const matches = all.filter(p => (p?.manifest?.header?.uuid || `no-uuid:${p.name}`) === groupKey);
    state.duplicateSelection[groupKey] = -1;
    matches.forEach(p => {
        const target = p._t === 'behavior' ? state.activationState.behaviorPacks
                      : p._t === 'resource' ? state.activationState.resourcePacks
                      : state.activationState.unknownPacks;
        target[p._id] = false;
    });
}

export function resolveDuplicateBoth(groupKey) {
    const all = [
        ...state.processedAddons.behaviorPacks.map(p => ({ ...p, _t: 'behavior' })),
        ...state.processedAddons.resourcePacks.map(p => ({ ...p, _t: 'resource' })),
        ...state.processedAddons.unknownPacks.map(p => ({ ...p, _t: 'unknown' }))
    ];
    const matches = all.filter(p => (p?.manifest?.header?.uuid || `no-uuid:${p.name}`) === groupKey);
    state.duplicateSelection[groupKey] = -2;
    matches.forEach(p => {
        const target = p._t === 'behavior' ? state.activationState.behaviorPacks
                      : p._t === 'resource' ? state.activationState.resourcePacks
                      : state.activationState.unknownPacks;
        target[p._id] = true;
    });
}

export function categorizeUnknownPack(packIndex, newCategory) {
    if (!newCategory || packIndex === undefined) return;
    const pack = state.processedAddons.unknownPacks[packIndex];
    if (!pack) return;

    delete pack.needsCategory;
    if (newCategory === 'behavior') {
        state.processedAddons.behaviorPacks.push(pack);
        state.activationState.behaviorPacks[pack._id] = true;
    } else if (newCategory === 'resource') {
        state.processedAddons.resourcePacks.push(pack);
        state.activationState.resourcePacks[pack._id] = true;
    }
    state.processedAddons.unknownPacks.splice(packIndex, 1);
    delete state.activationState.unknownPacks[pack._id];
}

export function selectAllPacks() {
    Object.keys(state.activationState.behaviorPacks).forEach(id => { state.activationState.behaviorPacks[id] = true; });
    Object.keys(state.activationState.resourcePacks).forEach(id => { state.activationState.resourcePacks[id] = true; });
    Object.keys(state.activationState.unknownPacks).forEach(id => { state.activationState.unknownPacks[id] = true; });
}

export function deselectAllPacks() {
    Object.keys(state.activationState.behaviorPacks).forEach(id => { state.activationState.behaviorPacks[id] = false; });
    Object.keys(state.activationState.resourcePacks).forEach(id => { state.activationState.resourcePacks[id] = false; });
    Object.keys(state.activationState.unknownPacks).forEach(id => { state.activationState.unknownPacks[id] = false; });
}

export function generateBehaviorPacksActivation() {
    const activePacks = [];
    state.processedAddons.behaviorPacks.forEach(pack => {
        if (state.activationState.behaviorPacks[pack._id]) {
            const uuid = pack?.manifest?.header?.uuid;
            const version = pack?.manifest?.header?.version;
            if (uuid && Array.isArray(version) && version.length === 3) {
                activePacks.push({ pack_id: uuid, version });
            }
        }
    });
    return activePacks;
}

export function generateResourcePacksActivation() {
    const activePacks = [];
    state.processedAddons.resourcePacks.forEach(pack => {
        if (state.activationState.resourcePacks[pack._id]) {
            const uuid = pack?.manifest?.header?.uuid;
            const version = pack?.manifest?.header?.version;
            if (uuid && Array.isArray(version) && version.length === 3) {
                activePacks.push({ pack_id: uuid, version });
            }
        }
    });
    return activePacks;
}

export function formatPacksJson(packs) {
    if (!packs || packs.length === 0) return '[\n\t\n]';
    return JSON.stringify(packs, null, '\t');
}
