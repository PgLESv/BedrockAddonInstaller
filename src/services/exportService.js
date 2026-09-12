import { CONFIG } from '../core/config.js';
import { state } from '../core/state.js';
import { sanitizeFolderName } from '../utils/security.js';
import { cleanupCache } from '../parsers/archive.js';
import { showToast, hapticFeedback } from '../utils/feedback.js';
import { generateBehaviorPacksActivation, generateResourcePacksActivation, formatPacksJson } from './packService.js';
import { elements } from '../ui/elements.js';

export async function downloadOrganizedAddons() {
    const startTime = Date.now();
    const downloadBtn = elements.downloadBtn;
    
    try {
        downloadBtn.disabled = true;
        downloadBtn.classList.add('btn-loading');
        downloadBtn.innerHTML = '<span>⏳ Preparando...</span>';

        const finalZip = new JSZip();
        const usedPaths = new Set();

        function getUniqueFolder(basePrefix, packName) {
            const cleanName = sanitizeFolderName(packName);
            let target = `${basePrefix}/${cleanName}/`.replace(/\/+/g, '/');
            if (!usedPaths.has(target)) {
                usedPaths.add(target);
                return target;
            }
            let counter = 2;
            while (usedPaths.has(`${basePrefix}/${cleanName}_${counter}/`.replace(/\/+/g, '/'))) {
                counter++;
            }
            const unique = `${basePrefix}/${cleanName}_${counter}/`.replace(/\/+/g, '/');
            usedPaths.add(unique);
            return unique;
        }

        function getCleanWorldPackPath(originalPath, defaultPrefix, packName) {
            if (originalPath) {
                let p = originalPath.replace(/\\/g, '/').replace(/^\/+/, '');
                const bpIdx = p.indexOf('behavior_packs/');
                const rpIdx = p.indexOf('resource_packs/');
                const unkIdx = p.indexOf('unknown_packs/');
                if (bpIdx >= 0) {
                    p = p.substring(bpIdx);
                } else if (rpIdx >= 0) {
                    p = p.substring(rpIdx);
                } else if (unkIdx >= 0) {
                    p = p.substring(unkIdx);
                }
                if (!p.endsWith('/')) p += '/';
                if (!usedPaths.has(p)) {
                    usedPaths.add(p);
                    return p;
                }
            }
            return getUniqueFolder(defaultPrefix, packName);
        }

        const totalPacks = state.processedAddons.behaviorPacks.length + 
                          state.processedAddons.resourcePacks.length + 
                          state.processedAddons.unknownPacks.length;
        let processedPacks = 0;

        // Behavior Packs
        for (const pack of state.processedAddons.behaviorPacks) {
            let targetPath;
            if (pack.fromWorld && pack.originalPath && !pack.fromNestedZip) {
                targetPath = getCleanWorldPackPath(pack.originalPath, 'behavior_packs', pack.name);
            } else {
                targetPath = getUniqueFolder('behavior_packs', pack.name);
            }
            const folder = finalZip.folder(targetPath);
            for (const [filePath, blob] of Object.entries(pack.files)) {
                folder.file(filePath, blob);
            }
            processedPacks++;
            downloadBtn.innerHTML = `<span>⏳ ${Math.round((processedPacks / totalPacks) * 100)}%</span>`;
        }

        // Resource Packs
        for (const pack of state.processedAddons.resourcePacks) {
            let targetPath;
            if (pack.fromWorld && pack.originalPath && !pack.fromNestedZip) {
                targetPath = getCleanWorldPackPath(pack.originalPath, 'resource_packs', pack.name);
            } else {
                targetPath = getUniqueFolder('resource_packs', pack.name);
            }
            const folder = finalZip.folder(targetPath);
            for (const [filePath, blob] of Object.entries(pack.files)) {
                folder.file(filePath, blob);
            }
            processedPacks++;
            downloadBtn.innerHTML = `<span>⏳ ${Math.round((processedPacks / totalPacks) * 100)}%</span>`;
        }

        // Unknown Packs
        for (const pack of state.processedAddons.unknownPacks) {
            let targetPath;
            if (pack.fromWorld && pack.originalPath) {
                targetPath = getCleanWorldPackPath(pack.originalPath, 'unknown_packs', pack.name);
            } else {
                targetPath = getUniqueFolder('unknown_packs', pack.name);
            }
            const folder = finalZip.folder(targetPath);
            for (const [filePath, blob] of Object.entries(pack.files)) {
                folder.file(filePath, blob);
            }
            processedPacks++;
        }

        const bpJson = formatPacksJson(generateBehaviorPacksActivation());
        finalZip.file('world_behavior_packs.json', bpJson);

        const rpJson = formatPacksJson(generateResourcePacksActivation());
        finalZip.file('world_resource_packs.json', rpJson);

        downloadBtn.innerHTML = '<span>⏳ Compactando...</span>';

        const blob = await finalZip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: CONFIG.COMPRESSION_LEVEL }
        }, (metadata) => {
            const percent = Math.round(metadata.percent);
            if (percent % 10 === 0) {
                downloadBtn.innerHTML = `<span>⏳ Compactando ${percent}%</span>`;
            }
        });

        const timestamp = new Date().toISOString().slice(0, 10);
        const fileName = state.worldMode && state.worldData 
            ? `${sanitizeFolderName(state.worldData.name)}_addons_${timestamp}.zip`
            : `minecraft_addons_${timestamp}.zip`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        cleanupCache();

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        showToast(`✅ Download concluído em ${elapsed}s`, 'success');
        hapticFeedback('success');
    } catch (error) {
        console.error('Erro ao gerar ZIP:', error);
        showToast(`❌ Erro ao gerar: ${error.message}`, 'error', 5000);
        hapticFeedback('error');
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.classList.remove('btn-loading');
        downloadBtn.innerHTML = `<span id="downloadBtnText">📥 Baixar Addons Organizados</span>`;
    }
}

export async function downloadSinglePack(packId) {
    const allPacks = [
        ...state.processedAddons.behaviorPacks,
        ...state.processedAddons.resourcePacks,
        ...state.processedAddons.unknownPacks
    ];
    const pack = allPacks.find(p => p._id === packId);
    if (!pack) {
        showToast('❌ Pack não encontrado.', 'error');
        return;
    }

    try {
        showToast(`⏳ Gerando .mcpack para "${pack.name}"...`, 'info', 2000);
        const zip = new JSZip();

        for (const [filePath, blob] of Object.entries(pack.files)) {
            zip.file(filePath, blob);
        }

        // Se o manifest foi editado na UI, garantir que o manifest.json empacotado esteja sincronizado
        if (pack.manifest) {
            zip.file('manifest.json', JSON.stringify(pack.manifest, null, '\t'));
        }

        const blob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: CONFIG.COMPRESSION_LEVEL }
        });

        const safeName = sanitizeFolderName(pack.name) || 'addon';
        const fileName = `${safeName}.mcpack`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`✅ "${fileName}" baixado com sucesso!`, 'success');
        hapticFeedback('success');
    } catch (error) {
        console.error('Erro ao baixar mcpack:', error);
        showToast(`❌ Erro ao baixar pack: ${error.message}`, 'error');
        hapticFeedback('error');
    }
}
