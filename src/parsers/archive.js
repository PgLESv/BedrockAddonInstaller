import { CONFIG } from '../core/config.js';
import { state } from '../core/state.js';

export function isArchiveFile(fileName) {
    const archiveExtensions = ['.zip', '.mcpack', '.mcaddon', '.tar', '.gz', '.tgz'];
    const lowerName = (fileName || '').toLowerCase();
    return archiveExtensions.some(ext => lowerName.endsWith(ext)) || lowerName.endsWith('.tar.gz');
}

export function cleanupCache() {
    const now = Date.now();
    if (now - state._cache.lastCleanup > CONFIG.CACHE_TTL) {
        state._cache.decompressedFiles.clear();
        state._cache.lastCleanup = now;
        console.log('🧹 Cache limpo');
    }
}

export async function processTarFile(uint8Array) {
    const zip = new JSZip();
    try {
        let offset = 0;
        const decoder = new TextDecoder('utf-8');
        let filesProcessed = 0;
        
        while (offset < uint8Array.length - 512) {
            const header = uint8Array.slice(offset, offset + 512);
            const isEmptyBlock = header.every(byte => byte === 0);
            if (isEmptyBlock) {
                const nextHeader = uint8Array.slice(offset + 512, offset + 1024);
                if (nextHeader.every(byte => byte === 0)) break;
                offset += 512;
                continue;
            }
            
            const nameBytes = header.slice(0, 100);
            const nameEnd = nameBytes.indexOf(0);
            let fileName = decoder.decode(nameBytes.slice(0, nameEnd > 0 ? nameEnd : 100)).trim();
            if (!fileName) {
                offset += 512;
                continue;
            }
            
            const fileType = String.fromCharCode(header[156]);
            const sizeBytes = header.slice(124, 136);
            const sizeStr = decoder.decode(sizeBytes).trim().replace(/\0/g, '').replace(/\s/g, '');
            let fileSize = parseInt(sizeStr, 8) || 0;
            
            if (fileType === 'L') {
                offset += 512;
                if (fileSize > 0 && offset + fileSize <= uint8Array.length) {
                    const longNameBytes = uint8Array.slice(offset, offset + fileSize);
                    fileName = decoder.decode(longNameBytes).replace(/\0/g, '').trim();
                }
                const padding = (512 - (fileSize % 512)) % 512;
                offset += fileSize + padding;
                continue;
            }
            
            const prefix = decoder.decode(header.slice(345, 500)).split('\0')[0].trim();
            if (prefix) fileName = prefix + '/' + fileName;
            
            offset += 512;
            
            if (fileType === '5' || fileName.endsWith('/')) {
                zip.folder(fileName.replace(/\/$/, ''));
                filesProcessed++;
            } else if (fileType === '0' || fileType === '\0' || fileType === '') {
                if (fileSize > 0 && offset + fileSize <= uint8Array.length) {
                    const content = uint8Array.slice(offset, offset + fileSize);
                    zip.file(fileName, content);
                    filesProcessed++;
                }
            }
            if (fileSize > 0) {
                const padding = (512 - (fileSize % 512)) % 512;
                offset += fileSize + padding;
            }
        }
        return zip;
    } catch (error) {
        console.error('❌ Erro ao processar TAR:', error);
        throw error;
    }
}

export async function decompressFile(file) {
    const fileName = file.name.toLowerCase();
    try {
        if (fileName.endsWith('.rar') || fileName.endsWith('.7z')) {
            throw new Error(`Arquivos ${fileName.endsWith('.rar') ? '.rar' : '.7z'} não são suportados diretamente. Converta para .zip.`);
        }
        
        if (fileName.endsWith('.gz') || fileName.endsWith('.tgz')) {
            const arrayBuffer = await file.arrayBuffer();
            const decompressed = pako.ungzip(new Uint8Array(arrayBuffer));
            if (fileName.endsWith('.tar.gz') || fileName.endsWith('.tgz')) {
                return await processTarFile(decompressed);
            } else {
                return await JSZip.loadAsync(new Blob([decompressed]));
            }
        }

        if (fileName.endsWith('.tar')) {
            const arrayBuffer = await file.arrayBuffer();
            return await processTarFile(new Uint8Array(arrayBuffer));
        }
        
        return await JSZip.loadAsync(file);
    } catch (error) {
        console.error(`Erro ao descompactar ${file.name}:`, error);
        throw error;
    }
}
