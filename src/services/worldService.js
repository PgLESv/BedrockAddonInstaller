import { state } from '../core/state.js';
import { decompressFile } from '../parsers/archive.js';
import { extractPackFromZip } from './packService.js';

export async function checkIfIsWorld(file) {
    try {
        const zip = await decompressFile(file);
        let hasWorldIndicators = false;
        zip.forEach((relativePath) => {
            const path = relativePath.toLowerCase();
            if (path.endsWith('level.dat') || 
                path.includes('world_behavior_packs.json') || 
                path.includes('world_resource_packs.json') ||
                path.includes('db/current') ||
                path.includes('db/manifest')) {
                hasWorldIndicators = true;
            }
        });
        return hasWorldIndicators;
    } catch (error) {
        console.warn('Erro ao verificar se é mundo:', error);
        return false;
    }
}

export async function processWorld(worldFile) {
    const zip = await decompressFile(worldFile);
    state.worldData = {
        name: worldFile.name.replace(/\.(mcworld|zip|tar\.gz|tgz|tar|7z)$/i, ''),
        existingBehaviorPacks: [],
        existingResourcePacks: [],
        activationFiles: { behavior: null, resource: null }
    };

    let worldRootPath = '';
    const allPaths = [];
    zip.forEach((relativePath) => allPaths.push(relativePath));

    for (const path of allPaths) {
        if (path.includes('behavior_packs/') || path.includes('resource_packs/') || 
            path.endsWith('level.dat') || path.endsWith('world_behavior_packs.json') || 
            path.endsWith('world_resource_packs.json')) {
            const match = path.match(/^(.*?)(behavior_packs|resource_packs|level\.dat|world_|db\/)/);
            if (match && match[1]) {
                worldRootPath = match[1];
                break;
            }
        }
    }

    const promises = [];
    zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
            const normalizedPath = worldRootPath ? relativePath.substring(worldRootPath.length) : relativePath;
            if (normalizedPath === 'world_behavior_packs.json' || relativePath.endsWith('/world_behavior_packs.json')) {
                promises.push(
                    zipEntry.async('string').then(c => { state.worldData.activationFiles.behavior = JSON.parse(c); }).catch(() => {})
                );
            } else if (normalizedPath === 'world_resource_packs.json' || relativePath.endsWith('/world_resource_packs.json')) {
                promises.push(
                    zipEntry.async('string').then(c => { state.worldData.activationFiles.resource = JSON.parse(c); }).catch(() => {})
                );
            } else if (normalizedPath.includes('behavior_packs/') && normalizedPath.endsWith('manifest.json')) {
                const packFolder = normalizedPath.substring(0, normalizedPath.lastIndexOf('/') + 1);
                promises.push(
                    extractPackFromZip(zip, relativePath, { suggestedPackType: 'behavior', isFromWorld: true, originalPath: packFolder })
                );
            } else if (normalizedPath.includes('resource_packs/') && normalizedPath.endsWith('manifest.json')) {
                const packFolder = normalizedPath.substring(0, normalizedPath.lastIndexOf('/') + 1);
                promises.push(
                    extractPackFromZip(zip, relativePath, { suggestedPackType: 'resource', isFromWorld: true, originalPath: packFolder })
                );
            } else if ((normalizedPath.includes('behavior_packs/') || normalizedPath.includes('resource_packs/')) && 
                       (normalizedPath.endsWith('.zip') || normalizedPath.endsWith('.mcpack'))) {
                const suggested = normalizedPath.includes('behavior_packs/') ? 'behavior' : 'resource';
                const packFolder = normalizedPath.substring(0, normalizedPath.lastIndexOf('/') + 1);
                promises.push(
                    zipEntry.async('arraybuffer').then(async (ab) => {
                        const nestedZip = await JSZip.loadAsync(ab);
                        let mPath = null;
                        nestedZip.forEach((rPath, e) => {
                            if (!e.dir && rPath.endsWith('manifest.json')) {
                                if (!mPath || rPath.split('/').length < mPath.split('/').length) mPath = rPath;
                            }
                        });
                        if (mPath) {
                            await extractPackFromZip(nestedZip, mPath, { suggestedPackType: suggested, isFromWorld: true, fromNestedZip: true, originalPath: packFolder });
                        }
                    }).catch(e => console.error('Erro em pack aninhado no mundo:', e))
                );
            }
        }
    });

    await Promise.all(promises);
}
