const state = {
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

const CONFIG = {
    MAX_FILE_SIZE: 3 * 1024 * 1024 * 1024,
    MAX_FILES: 200,
    CACHE_TTL: 5 * 60 * 1000,
    COMPRESSION_LEVEL: 6,
    SUPPORTED_EXTENSIONS: ['.zip', '.rar', '.mcpack', '.mcaddon', '.mcworld', '.tar', '.gz', '.tgz', '.7z']
};

let __packIdSeq = 0;
function __genPackId() {
    return `pack_${Date.now()}_${__packIdSeq++}`;
}

function cleanupCache() {
    const now = Date.now();
    if (now - state._cache.lastCleanup > CONFIG.CACHE_TTL) {
        state._cache.decompressedFiles.clear();
        state._cache.lastCleanup = now;
        console.log('🧹 Cache limpo');
    }
}

function validateFile(file) {
    const errors = [];
    
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        errors.push(`Arquivo muito grande (máx: ${formatFileSize(CONFIG.MAX_FILE_SIZE)})`);
    }
    
    if (file.size === 0) {
        errors.push('Arquivo vazio');
    }
    
    const fileName = file.name.toLowerCase();
    const extension = fileName.substring(fileName.lastIndexOf('.'));
    const isTarGz = fileName.endsWith('.tar.gz');
    const isValid = CONFIG.SUPPORTED_EXTENSIONS.includes(extension) || isTarGz;
    
    if (!isValid) {
        errors.push(`Extensão não suportada: ${extension}`);
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

let toastTimeout = null;
function showToast(message, type = 'info', duration = 3000) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    if (toastTimeout) clearTimeout(toastTimeout);
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    toast.offsetHeight;
    toast.classList.add('show');
    
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const filesList = document.getElementById('filesList');
const actions = document.getElementById('actions');
const processBtn = document.getElementById('processBtn');
const clearBtn = document.getElementById('clearBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultsSection = document.getElementById('resultsSection');
const resultsStats = document.getElementById('resultsStats');
const downloadBtn = document.getElementById('downloadBtn');
const downloadBtnText = document.getElementById('downloadBtnText');
const packsActivation = document.getElementById('packsActivation');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');
const worldInfo = document.getElementById('worldInfo');
const worldName = document.getElementById('worldName');
const worldManagement = document.getElementById('worldManagement');
const additionalAddons = document.getElementById('additionalAddons');
const additionalAddonsList = document.getElementById('additionalAddonsList');
const resultsTitle = document.getElementById('resultsTitle');
const activationTitle = document.getElementById('activationTitle');
const activationDescription = document.getElementById('activationDescription');

function hapticFeedback(type = 'light') {
    if ('vibrate' in navigator) {
        const patterns = {
            light: [10],
            medium: [20],
            heavy: [30],
            success: [10, 50, 10],
            error: [50, 30, 50]
        };
        navigator.vibrate(patterns[type] || patterns.light);
    }
}

dropZone.addEventListener('click', (e) => {
    const clickedElement = e.target;
    const isInteractiveElement = 
        clickedElement.tagName === 'LABEL' ||
        clickedElement.tagName === 'SUMMARY' ||
        clickedElement.tagName === 'DETAILS' ||
        clickedElement.tagName === 'A' ||
        clickedElement.closest('details') ||
        clickedElement.closest('summary');
    
    if (!isInteractiveElement) {
        hapticFeedback('light');
        fileInput.click();
    }
});

dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        hapticFeedback('light');
        fileInput.click();
    }
});

fileInput.addEventListener('change', handleFileSelect);

processBtn.addEventListener('click', () => {
    hapticFeedback('medium');
    processAddons();
});

clearBtn.addEventListener('click', () => {
    hapticFeedback('light');
    clearFiles();
});

downloadBtn.addEventListener('click', () => {
    hapticFeedback('success');
    downloadOrganizedAddons();
});

selectAllBtn.addEventListener('click', () => {
    hapticFeedback('light');
    selectAllPacks();
});

deselectAllBtn.addEventListener('click', () => {
    hapticFeedback('light');
    deselectAllPacks();
});

additionalAddons.addEventListener('change', handleAdditionalAddons);

let dragCounter = 0;

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
});

dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
        dropZone.classList.remove('drag-over');
    }
});

dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dragCounter = 0;
    dropZone.classList.remove('drag-over');
    hapticFeedback('medium');
    const files = Array.from(e.dataTransfer.files);
    await addFiles(files);
});

async function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    await addFiles(files);
}

async function addFiles(files) {
    if (state.uploadedFiles.length + files.length > CONFIG.MAX_FILES) {
        showToast(`⚠️ Máximo de ${CONFIG.MAX_FILES} arquivos por vez`, 'error');
        return;
    }
    
    let addedCount = 0;
    let errorCount = 0;
    
    for (const file of files) {
        const validation = validateFile(file);
        if (!validation.valid) {
            console.warn(`❌ ${file.name}: ${validation.errors.join(', ')}`);
            showToast(`❌ ${file.name}: ${validation.errors[0]}`, 'error');
            hapticFeedback('error');
            errorCount++;
            continue;
        }
        
        const fileName = file.name.toLowerCase();
        const extension = fileName.substring(fileName.lastIndexOf('.'));
        const isTarGz = fileName.endsWith('.tar.gz');
        
        let isWorld = extension === '.mcworld' || fileName.includes('world') || fileName.includes('mundo') || fileName.includes('mapa');
        
        if (!isWorld && (extension === '.zip' || extension === '.tar' || isTarGz)) {
            try {
                isWorld = await checkIfIsWorld(file);
            } catch (err) {
                console.warn('Erro ao verificar mundo:', err);
            }
        }
        
        if (isWorld) {
            state.uploadedFiles = [file];
            state.worldMode = true;
            showToast('🌍 Mundo detectado!', 'success');
            addedCount = 1;
            break; // Mundo substitui tudo
        } else {
            const exists = state.uploadedFiles.some(f => f.name === file.name && f.size === file.size);
            if (!exists) {
                state.uploadedFiles.push(file);
                addedCount++;
            }
        }
    }
    
    if (addedCount > 0) {
        const count = state.uploadedFiles.length;
        showToast(`✅ ${count} arquivo${count > 1 ? 's' : ''} pronto${count > 1 ? 's' : ''}`, 'success', 2000);
    } else if (errorCount > 0) {
        showToast(`❌ ${errorCount} arquivo${errorCount > 1 ? 's' : ''} com erro`, 'error');
    }
    
    renderFilesList();
    updateActionsVisibility();
}

async function checkIfIsWorld(file) {
    try {
        const zip = await decompressFile(file);
        
        let hasWorldIndicators = false;
        
        zip.forEach((relativePath, zipEntry) => {
            const path = relativePath.toLowerCase();
            if (path.includes('level.dat') || 
                path.includes('world_behavior_packs.json') || 
                path.includes('world_resource_packs.json') ||
                path.includes('db/') ||
                path.match(/behavior_packs\/.*\/manifest\.json/) ||
                path.match(/resource_packs\/.*\/manifest\.json/)) {
                hasWorldIndicators = true;
            }
        });
        
        return hasWorldIndicators;
    } catch (error) {
        console.warn('Erro ao verificar se é mundo:', error);
        return false;
    }
}

function renderFilesList() {
    if (state.uploadedFiles.length === 0) {
        filesList.innerHTML = '';
        return;
    }
    
    const truncateName = (name, maxLen = 35) => {
        if (name.length <= maxLen) return name;
        const ext = name.lastIndexOf('.');
        const extension = ext > -1 ? name.slice(ext) : '';
        const baseName = ext > -1 ? name.slice(0, ext) : name;
        const truncLen = maxLen - extension.length - 3;
        return baseName.slice(0, truncLen) + '...' + extension;
    };
    
    filesList.innerHTML = state.uploadedFiles.map((file, index) => `
        <div class="file-item" role="listitem">
            <div class="file-info">
                <span class="file-icon" aria-hidden="true">${getFileIcon(file.name)}</span>
                <div class="file-details">
                    <h4 title="${file.name}">${truncateName(file.name)}</h4>
                    <p>${formatFileSize(file.size)}</p>
                </div>
            </div>
            <button class="file-remove" onclick="removeFile(${index})" aria-label="Remover ${file.name}">
                <span aria-hidden="true">✕</span> Remover
            </button>
        </div>
    `).join('');
}

function getFileIcon(fileName) {
    const name = fileName.toLowerCase();
    if (name.endsWith('.mcworld')) return '🌍';
    if (name.endsWith('.mcpack') || name.endsWith('.mcaddon')) return '📦';
    if (name.endsWith('.zip') || name.endsWith('.7z')) return '🗜️';
    if (name.endsWith('.rar')) return '📁';
    return '📄';
}

function removeFile(index) {
    hapticFeedback('light');
    state.uploadedFiles.splice(index, 1);
    renderFilesList();
    updateActionsVisibility();
}

function clearFiles() {
    state.uploadedFiles = [];
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
    state.worldMode = false;
    state.worldData = null;
    renderFilesList();
    updateActionsVisibility();
    resultsSection.style.display = 'none';
    progressSection.style.display = 'none';
}

function updateActionsVisibility() {
    actions.style.display = state.uploadedFiles.length > 0 ? 'flex' : 'none';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function processAddons() {
    if (state.uploadedFiles.length === 0) return;
    
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
    
    progressSection.style.display = 'block';
    resultsSection.style.display = 'none';
    actions.style.display = 'none';
    
    try {
        const totalFiles = state.uploadedFiles.length;
        
        if (state.worldMode && totalFiles === 1) {
            updateProgress(25, 'Detectado mundo, analisando conteúdo...');
            await processWorld(state.uploadedFiles[0]);
            updateProgress(100, 'Mundo carregado!');
        } else {
            for (let i = 0; i < totalFiles; i++) {
                const file = state.uploadedFiles[i];
                const progress = ((i + 1) / totalFiles) * 100;
                
                updateProgress(progress, `Processando ${file.name}...`);
                
                await processAddonFile(file);
            }
            
            updateProgress(100, 'Concluído!');
        }
        
        showResults();
        
    } catch (error) {
        console.error('Erro ao processar addons:', error);
        showToast(`❌ Erro: ${error.message}`, 'error', 5000);
        hapticFeedback('error');
        progressSection.style.display = 'none';
        actions.style.display = 'flex';
    }
}

async function processWorld(worldFile) {
    try {
        const zip = await decompressFile(worldFile);
        
        state.worldData = {
            name: worldFile.name.replace(/\.(mcworld|zip|tar\.gz|tgz|rar|7z)$/i, ''),
            existingBehaviorPacks: [],
            existingResourcePacks: [],
            activationFiles: {
                behavior: null,
                resource: null
            }
        };
        
        let worldRootPath = '';
        const allPaths = [];
        
        zip.forEach((relativePath, zipEntry) => {
            allPaths.push(relativePath);
        });
        
        for (const path of allPaths) {
            if (path.includes('behavior_packs/') || path.includes('resource_packs/') || 
                path.endsWith('level.dat') || path.endsWith('world_behavior_packs.json') || 
                path.endsWith('world_resource_packs.json')) {
                
                const match = path.match(/^(.*?)(behavior_packs|resource_packs|level\.dat|world_|db\/)/);
                if (match && match[1]) {
                    worldRootPath = match[1];
                    console.log('Mundo encontrado no caminho:', worldRootPath);
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
                        zipEntry.async('string').then(content => {
                            state.worldData.activationFiles.behavior = JSON.parse(content);
                        }).catch(e => console.warn('Erro ao ler world_behavior_packs.json:', e))
                    );
                } else if (normalizedPath === 'world_resource_packs.json' || relativePath.endsWith('/world_resource_packs.json')) {
                    promises.push(
                        zipEntry.async('string').then(content => {
                            state.worldData.activationFiles.resource = JSON.parse(content);
                        }).catch(e => console.warn('Erro ao ler world_resource_packs.json:', e))
                    );
                }
                else if (normalizedPath.includes('behavior_packs/') && normalizedPath.endsWith('manifest.json')) {
                    promises.push(
                        processWorldAddon(zip, relativePath, 'behavior', worldRootPath)
                    );
                }
                else if (normalizedPath.includes('resource_packs/') && normalizedPath.endsWith('manifest.json')) {
                    promises.push(
                        processWorldAddon(zip, relativePath, 'resource', worldRootPath)
                    );
                }
                // Detectar addons em .zip/.mcpack dentro de behavior_packs/
                else if (normalizedPath.includes('behavior_packs/') && (normalizedPath.endsWith('.zip') || normalizedPath.endsWith('.mcpack'))) {
                    promises.push(
                        processWorldNestedZipAddon(zipEntry, 'behavior', relativePath)
                    );
                }
                // Detectar addons em .zip/.mcpack dentro de resource_packs/
                else if (normalizedPath.includes('resource_packs/') && (normalizedPath.endsWith('.zip') || normalizedPath.endsWith('.mcpack'))) {
                    promises.push(
                        processWorldNestedZipAddon(zipEntry, 'resource', relativePath)
                    );
                }
            }
        });
        
        await Promise.all(promises);
        
        state.processedAddons.behaviorPacks.forEach(pack => {
            state.activationState.behaviorPacks[pack._id] = true;
        });
        
        state.processedAddons.resourcePacks.forEach(pack => {
            state.activationState.resourcePacks[pack._id] = true;
        });
        
        state.processedAddons.unknownPacks.forEach(pack => {
            state.activationState.unknownPacks[pack._id] = true;
        });
        
    } catch (error) {
        console.error('Erro ao processar mundo:', error);
        throw error;
    }
}

async function processWorldAddon(zip, manifestPath, suggestedPackType, worldRootPath = '') {
    try {
        let manifestContent = await zip.file(manifestPath).async('string');
        
        manifestContent = removeJsonComments(manifestContent);
        
        let manifest;
        try {
            manifest = JSON.parse(manifestContent);
        } catch (parseError) {
            console.error(`❌ Erro ao fazer parse do JSON em ${manifestPath}:`, parseError.message);
            
            let cleaned = manifestContent
                .replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, '')
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n');
            
            try {
                manifest = JSON.parse(cleaned);
                console.log(`✅ JSON do mundo corrigido com limpeza adicional em ${manifestPath}`);
            } catch (secondError) {
                console.warn(`⚠️ JSON corrompido no mundo: ${manifestPath}`);
                console.error('Conteúdo problemático (primeiros 500 chars):', manifestContent.substring(0, 500));
                
                const folderName = manifestPath.split('/').filter(p => p).slice(-2, -1)[0] || 'Unknown Pack';
                const randomUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                    const r = Math.random() * 16 | 0;
                    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
                });
                
                manifest = {
                    format_version: 2,
                    header: {
                        name: folderName + ' ⚠️',
                        description: 'Manifest corrompido - Pack do mundo',
                        uuid: randomUUID(),
                        version: [1, 0, 0],
                        min_engine_version: [1, 20, 0]
                    },
                    modules: []
                };
                
                console.log(`🌍 Manifest genérico criado para pack de mundo: ${folderName}`);
            }
        }
        
    const addonRootPath = manifestPath.substring(0, manifestPath.lastIndexOf('/') + 1);
        
        const pathParts = addonRootPath.split('/').filter(p => p);
        const addonFolderName = pathParts[pathParts.length - 1];
        const addonName = manifest.header?.name || addonFolderName || 'Unknown';
        
        let packType = suggestedPackType;
        
        if (manifest.modules && Array.isArray(manifest.modules)) {
            for (const module of manifest.modules) {
                if (module.type === 'data') {
                    packType = 'behavior';
                    break;
                } else if (module.type === 'resources') {
                    packType = 'resource';
                    break;
                }
            }
        }
        
        if (!packType || (packType !== 'behavior' && packType !== 'resource')) {
            console.warn(`⚠️ Pack sem tipo em mundo: ${manifestPath}`);
            packType = 'unknown';
        }
        
        const addonFiles = {};
        const promises = [];
        
        zip.forEach((relativePath, zipEntry) => {
            if (relativePath.startsWith(addonRootPath) && !zipEntry.dir) {
                const relativePathInAddon = relativePath.substring(addonRootPath.length);
                
                promises.push(
                    zipEntry.async('blob').then(blob => {
                        addonFiles[relativePathInAddon] = blob;
                    })
                );
            }
        });
        
        await Promise.all(promises);

        const normalizedOriginalPath = (worldRootPath && addonRootPath.startsWith(worldRootPath))
            ? addonRootPath.substring(worldRootPath.length)
            : addonRootPath;

        const addonData = {
            _id: __genPackId(),
            name: addonName,
            files: addonFiles,
            manifest: manifest,
            fromWorld: true,
            originalPath: normalizedOriginalPath,
            hasCorruptedManifest: manifest.header?.description?.includes('Manifest corrompido') || false
        };
        
        if (packType === 'behavior') {
            state.processedAddons.behaviorPacks.push(addonData);
        } else if (packType === 'resource') {
            state.processedAddons.resourcePacks.push(addonData);
        } else {
            state.processedAddons.unknownPacks.push(addonData);
        }
        
    } catch (error) {
        console.error(`❌ Erro ao processar addon do mundo em ${manifestPath}:`, error);
    }
}

async function processWorldNestedZipAddon(zipEntry, suggestedPackType, originalPath) {
    try {
        console.log(`📦 Processando addon em ZIP dentro do mundo: ${originalPath}`);
        
        const zipData = await zipEntry.async('arraybuffer');
        const nestedZip = await JSZip.loadAsync(zipData);
        
        let manifestContent = null;
        let manifestPath = null;
        
        nestedZip.forEach((relativePath, entry) => {
            if (!entry.dir && relativePath.endsWith('manifest.json')) {
                const depth = relativePath.split('/').length;
                if (!manifestPath || depth < manifestPath.split('/').length) {
                    manifestPath = relativePath;
                }
            }
        });
        
        if (!manifestPath) {
            console.warn(`⚠️ Nenhum manifest.json encontrado no ZIP aninhado: ${originalPath}`);
            return;
        }
        
        manifestContent = await nestedZip.file(manifestPath).async('string');
        manifestContent = removeJsonComments(manifestContent);
        
        let manifest;
        try {
            manifest = JSON.parse(manifestContent);
        } catch (parseError) {
            console.error(`❌ Erro ao fazer parse do JSON em ${originalPath}:`, parseError.message);
            
            let cleaned = manifestContent
                .replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, '')
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n');
            
            try {
                manifest = JSON.parse(cleaned);
                console.log(`✅ JSON corrigido com limpeza adicional em ${originalPath}`);
            } catch (secondError) {
                console.warn(`⚠️ JSON corrompido no ZIP aninhado: ${originalPath}`);
                
                const fileName = originalPath.split('/').pop().replace(/\.(zip|mcpack)$/i, '');
                const randomUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                    const r = Math.random() * 16 | 0;
                    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
                });
                
                manifest = {
                    format_version: 2,
                    header: {
                        name: fileName + ' ⚠️',
                        description: 'Manifest corrompido - Pack do mundo (ZIP)',
                        uuid: randomUUID(),
                        version: [1, 0, 0],
                        min_engine_version: [1, 20, 0]
                    },
                    modules: []
                };
            }
        }
        
        const addonName = manifest.header?.name || originalPath.split('/').pop().replace(/\.(zip|mcpack)$/i, '') || 'Unknown';
        
        let packType = suggestedPackType;
        
        if (manifest.modules && Array.isArray(manifest.modules)) {
            for (const module of manifest.modules) {
                if (module.type === 'data') {
                    packType = 'behavior';
                    break;
                } else if (module.type === 'resources') {
                    packType = 'resource';
                    break;
                }
            }
        }
        
        if (!packType || (packType !== 'behavior' && packType !== 'resource')) {
            packType = 'unknown';
        }
        
        const manifestRoot = manifestPath.includes('/') ? manifestPath.substring(0, manifestPath.lastIndexOf('/') + 1) : '';
        
        const addonFiles = {};
        const promises = [];
        
        nestedZip.forEach((relativePath, entry) => {
            if (!entry.dir) {
                let relativePathInAddon = relativePath;
                if (manifestRoot && relativePath.startsWith(manifestRoot)) {
                    relativePathInAddon = relativePath.substring(manifestRoot.length);
                }
                
                promises.push(
                    entry.async('blob').then(blob => {
                        addonFiles[relativePathInAddon] = blob;
                    })
                );
            }
        });
        
        await Promise.all(promises);
        
        const addonData = {
            _id: __genPackId(),
            name: addonName,
            files: addonFiles,
            manifest: manifest,
            fromWorld: true,
            fromNestedZip: true,
            originalPath: originalPath,
            hasCorruptedManifest: manifest.header?.description?.includes('Manifest corrompido') || false
        };
        
        console.log(`✅ Addon de ZIP aninhado processado: ${addonName} (${packType})`);
        
        if (packType === 'behavior') {
            state.processedAddons.behaviorPacks.push(addonData);
        } else if (packType === 'resource') {
            state.processedAddons.resourcePacks.push(addonData);
        } else {
            state.processedAddons.unknownPacks.push(addonData);
        }
        
    } catch (error) {
        console.error(`❌ Erro ao processar addon ZIP aninhado em ${originalPath}:`, error);
    }
}

function isArchiveFile(fileName) {
    const archiveExtensions = ['.zip', '.rar', '.mcpack', '.mcaddon', '.tar', '.gz', '.tgz', '.7z'];
    const lowerName = fileName.toLowerCase();
    return archiveExtensions.some(ext => lowerName.endsWith(ext)) || lowerName.endsWith('.tar.gz');
}

async function decompressFile(file) {
    const fileName = file.name.toLowerCase();
    
    try {
        if (fileName.endsWith('.rar')) {
            console.warn('⚠️ Arquivo RAR detectado:', fileName);
            showToast('⚠️ RAR tem suporte limitado - prefira .zip', 'error', 5000);
        }
        
        if (fileName.endsWith('.gz')) {
            console.log('🔓 Descompactando arquivo GZIP...');
            const arrayBuffer = await file.arrayBuffer();
            const decompressed = pako.ungzip(new Uint8Array(arrayBuffer));
            console.log(`✅ GZIP descompactado: ${decompressed.length} bytes`);
            
            if (fileName.endsWith('.tar.gz') || fileName.endsWith('.tgz')) {
                console.log('📦 Detectado arquivo TAR dentro do GZIP');
                return await processTarFile(decompressed);
            } else {
                const blob = new Blob([decompressed]);
                return await JSZip.loadAsync(blob);
            }
        }
        
        console.log(`📦 Processando com JSZip: ${fileName}`);
        return await JSZip.loadAsync(file);
        
    } catch (error) {
        console.error(`Erro ao descompactar ${file.name}:`, error);
        throw error;
    }
}

async function processTarFile(uint8Array) {
    const zip = new JSZip();
    
    try {
        let offset = 0;
        const decoder = new TextDecoder('utf-8');
        let filesProcessed = 0;
        
        console.log('🔍 Iniciando processamento TAR...');
        
        while (offset < uint8Array.length - 512) {
            const header = uint8Array.slice(offset, offset + 512);
            
            const isEmptyBlock = header.every(byte => byte === 0);
            if (isEmptyBlock) {
                const nextHeader = uint8Array.slice(offset + 512, offset + 1024);
                const isNextEmpty = nextHeader.every(byte => byte === 0);
                if (isNextEmpty) {
                    console.log(`✅ TAR processado: ${filesProcessed} entradas encontradas`);
                    break;
                }
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
            let fileSize = 0;
            
            try {
                fileSize = parseInt(sizeStr, 8) || 0;
            } catch (e) {
                console.warn('Erro ao ler tamanho do arquivo:', fileName);
            }
            
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
            if (prefix) {
                fileName = prefix + '/' + fileName;
            }
            
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
        
        console.log(`📦 TAR descompactado: ${filesProcessed} entradas`);
        return zip;
        
    } catch (error) {
        console.error('❌ Erro ao processar TAR:', error);
        throw error;
    }
}

async function processAddonFile(file) {
    try {
        const zip = await decompressFile(file);
        
        const fileCount = Object.keys(zip.files).length;
        if (fileCount === 0) {
            console.error(`❌ Arquivo ${file.name} parece estar vazio ou corrompido`);
            if (file.name.toLowerCase().endsWith('.rar')) {
                alert(`⚠️ Erro ao processar ${file.name}\n\nArquivos .rar não são totalmente suportados.\n\nSolução:\n1. Extraia o .rar no seu computador\n2. Recompacte como .zip\n3. Envie o .zip`);
            }
            return;
        }
        
        console.log(`📦 Processando ${file.name} (${fileCount} arquivos encontrados)`);
        
        const nestedArchives = [];
        const manifestFiles = [];
        
        zip.forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir) {
                if (isArchiveFile(zipEntry.name)) {
                    nestedArchives.push({ path: relativePath, entry: zipEntry });
                }
                else if (zipEntry.name.toLowerCase().endsWith('manifest.json')) {
                    manifestFiles.push({ path: relativePath, entry: zipEntry });
                }
            }
        });
        
        if (nestedArchives.length > 0) {
            console.log(`Encontrados ${nestedArchives.length} arquivos nested em ${file.name}`);
            
            for (const nestedArchive of nestedArchives) {
                try {
                    const nestedBlob = await nestedArchive.entry.async('blob');
                    
                    const nestedFileName = nestedArchive.path.split('/').pop();
                    const nestedFile = new File([nestedBlob], nestedFileName, { 
                        type: 'application/zip' 
                    });
                    

                    await processAddonFile(nestedFile);
                } catch (error) {
                    console.error(`Erro ao processar arquivo nested ${nestedArchive.path}:`, error);
                }
            }
        }
        

        if (manifestFiles.length > 0) {
            console.log(`✅ Encontrados ${manifestFiles.length} manifest(s) em ${file.name}:`);
            manifestFiles.forEach(mf => console.log(`  - ${mf.path}`));
            

            for (const manifestFile of manifestFiles) {
                await processManifest(zip, manifestFile.path, file.name);
            }
        } else if (nestedArchives.length === 0) {

            console.warn(`❌ Nenhum manifest.json ou arquivo nested encontrado em ${file.name}`);

            console.log('📁 Arquivos encontrados no arquivo:');
            let count = 0;
            zip.forEach((relativePath, zipEntry) => {
                if (count < 20) {
                    console.log(`  - ${zipEntry.dir ? '📂' : '📄'} ${relativePath}`);
                    count++;
                }
            });
            if (count >= 20) {
                console.log('  ... (mais arquivos não mostrados)');
            }
        }
        
    } catch (error) {
        console.error(`❌ Erro ao processar ${file.name}:`, error);

        if (file.name.toLowerCase().endsWith('.rar')) {
            console.error('💡 Dica: Arquivos .rar têm suporte limitado. Tente converter para .zip primeiro.');
        }
    }
}

function removeJsonComments(jsonString) {
    let cleaned = jsonString.replace(/\/\/.*$/gm, '');
    
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    
    cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, ' ');
    
    return cleaned;
}

function extractManifestEssentials(rawText) {
    try {
        const result = { uuid: null, version: null };
        const headerBlockMatch = rawText.match(/"header"\s*:\s*\{([\s\S]*?)\}/i);
        const scope = headerBlockMatch ? headerBlockMatch[1] : rawText;
        const uuidMatch = scope.match(/"uuid"\s*:\s*"([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})"/);
        if (uuidMatch) {
            result.uuid = uuidMatch[1];
        }
        const versionMatch = scope.match(/"version"\s*:\s*\[\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\]/);
        if (versionMatch) {
            result.version = [parseInt(versionMatch[1], 10), parseInt(versionMatch[2], 10), parseInt(versionMatch[3], 10)];
        }
        return result;
    } catch (e) {
        return { uuid: null, version: null };
    }
}

async function processManifest(zip, manifestPath, fileName, isFromWorld = false, originalPath = '') {
    try {
        let manifestContent = await zip.file(manifestPath).async('string');
        
        manifestContent = removeJsonComments(manifestContent);
        
        let manifest;
        try {
            manifest = JSON.parse(manifestContent);
        } catch (parseError) {
            console.error(`❌ Erro ao fazer parse do JSON em ${manifestPath}:`, parseError.message);
            
            let cleaned = manifestContent
                .replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, '')
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n');
            
            try {
                manifest = JSON.parse(cleaned);
                console.log(`✅ JSON corrigido com limpeza adicional em ${manifestPath}`);
            } catch (secondError) {
                console.warn(`⚠️ JSON corrompido em ${manifestPath}`);
                console.error('Conteúdo problemático (primeiros 500 chars):', manifestContent.substring(0, 500));

                const pathLooksWorld = /(^|\/)behavior_packs\//.test(manifestPath) || /(^|\/)resource_packs\//.test(manifestPath);
                const treatAsWorld = isFromWorld || (state.worldMode && pathLooksWorld);

                if (treatAsWorld) {
                    console.log(`🌍 Pack de mundo será carregado com manifest genérico`);
                    const folderName = manifestPath.split('/').filter(p => p).slice(-2, -1)[0] || 'Unknown Pack';
                    const randomUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                        const r = Math.random() * 16 | 0;
                        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
                    });
                    manifest = {
                        format_version: 2,
                        header: {
                            name: folderName + ' ⚠️',
                            description: 'Manifest corrompido - Pack do mundo',
                            uuid: randomUUID(),
                            version: [1, 0, 0]
                        },
                        modules: []
                    };
                    isFromWorld = true;
                    originalPath = originalPath || manifestPath.substring(0, manifestPath.lastIndexOf('/') + 1);
                } else {
                    console.log(`✨ Novo addon com manifest inválido — criando placeholder e extraindo dados essenciais`);
                    const folderName = fileName.replace(/\.(zip|rar|mcpack|mcaddon)$/i, '') || 'Addon Desconhecido';
                    const essentials = extractManifestEssentials(manifestContent);
                    const randomUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                        const r = Math.random() * 16 | 0;
                        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
                    });
                    manifest = {
                        format_version: 2,
                        header: {
                            name: folderName + ' ⚠️',
                            description: 'Manifest inválido — placeholder gerado automaticamente',
                            uuid: essentials.uuid || randomUUID(),
                            version: essentials.version || [1, 0, 0]
                        },
                        modules: []
                    };
                }
            }
        }
        
        const addonRootPath = manifestPath.substring(0, manifestPath.lastIndexOf('/') + 1);
        
        const addonName = manifest.header?.name || fileName.replace(/\.(zip|rar|mcpack|mcaddon)$/i, '');
        
        let packType = null;
        
        if (manifest.modules && Array.isArray(manifest.modules)) {
            for (const module of manifest.modules) {
                if (module.type === 'data') {
                    packType = 'behavior';
                    break;
                } else if (module.type === 'resources') {
                    packType = 'resource';
                    break;
                }
            }
        }
        
        if (!packType) {
            console.warn(`⚠️ Tipo de pack não identificado em ${manifestPath}`);
            
            const pathLooksWorld = /(^|\/)behavior_packs\//.test(manifestPath) || /(^|\/)resource_packs\//.test(manifestPath);
            if (isFromWorld || (state.worldMode && pathLooksWorld)) {
                console.log(`📌 Pack de mundo mantido na pasta original: ${originalPath}`);
                packType = 'unknown';
            } else {
                console.warn(`❓ Pack será marcado como 'Desconhecido' - categorize manualmente`);
                packType = 'unknown';
            }
        }
        
        const addonFiles = {};
        const promises = [];
        
        zip.forEach((relativePath, zipEntry) => {
            if (relativePath.startsWith(addonRootPath) && !zipEntry.dir) {
                const relativePathInAddon = relativePath.substring(addonRootPath.length);
                
                promises.push(
                    zipEntry.async('blob').then(blob => {
                        addonFiles[relativePathInAddon] = blob;
                    })
                );
            }
        });
        
        await Promise.all(promises);
        
        const pathLooksWorld = /(^|\/)behavior_packs\//.test(manifestPath) || /(^|\/)resource_packs\//.test(manifestPath);
        const isWorldPack = isFromWorld || (state.worldMode && pathLooksWorld);
        const addonData = {
            _id: __genPackId(),
            name: addonName,
            files: addonFiles,
            manifest: manifest,
            originalPath: originalPath || addonRootPath,
            needsCategory: packType === 'unknown' && !isWorldPack,
            fromWorld: isWorldPack,
            hasCorruptedManifest: (manifest.header?.description || '').includes('Manifest corrompido')
        };
        
        if (packType === 'behavior') {
            state.processedAddons.behaviorPacks.push(addonData);
        } else if (packType === 'resource') {
            state.processedAddons.resourcePacks.push(addonData);
        } else if (packType === 'unknown') {
            state.processedAddons.unknownPacks.push(addonData);
        }
        
    } catch (error) {
        console.error(`Erro ao processar manifest em ${manifestPath}:`, error);
    }
}

function updateProgress(percentage, text) {
    progressFill.style.width = percentage + '%';
    progressText.textContent = text;
}

function calculateTotalSize() {
    let total = 0;
    
    const allPacks = [
        ...state.processedAddons.behaviorPacks,
        ...state.processedAddons.resourcePacks,
        ...state.processedAddons.unknownPacks
    ];
    
    for (const pack of allPacks) {
        for (const blob of Object.values(pack.files)) {
            total += blob.size || 0;
        }
    }
    
    return total;
}

function showResults() {
    progressSection.style.display = 'none';
    resultsSection.style.display = 'block';
    
    const totalBehavior = state.processedAddons.behaviorPacks.length;
    const totalResource = state.processedAddons.resourcePacks.length;
    const totalUnknown = state.processedAddons.unknownPacks.length;
    const totalAddons = totalBehavior + totalResource + totalUnknown;
    const totalSize = calculateTotalSize();
    
    const corruptedCount = [
        ...state.processedAddons.behaviorPacks,
        ...state.processedAddons.resourcePacks,
        ...state.processedAddons.unknownPacks
    ].filter(p => p.hasCorruptedManifest).length;
    
    if (state.worldMode && state.worldData) {
        resultsTitle.textContent = '🌍 Gerenciamento de Mundo';
        worldInfo.style.display = 'block';
        worldName.textContent = state.worldData.name;
        worldManagement.style.display = 'block';
        downloadBtnText.textContent = '📥 Baixar Apenas Addons (sem o mapa)';
        activationTitle.textContent = '⚙️ Gerenciar Addons do Mundo';
        activationDescription.textContent = 'Marque os addons que deseja manter ativos. Desmarcados serão removidos da ativação.';
    } else {
        resultsTitle.textContent = '✅ Processamento Concluído!';
        worldInfo.style.display = 'none';
        worldManagement.style.display = 'none';
        downloadBtnText.textContent = '📥 Baixar Addons Organizados';
        activationTitle.textContent = '⚙️ Ativar Addons';
        activationDescription.textContent = 'Selecione quais addons devem ser ativados automaticamente no mundo';
    }
    
    let statsHTML = `
        <div class="stat-card">
            <h4>${totalAddons}</h4>
            <p>Total de Addons</p>
        </div>
        <div class="stat-card">
            <h4>${totalBehavior}</h4>
            <p>Behavior Packs</p>
        </div>
        <div class="stat-card">
            <h4>${totalResource}</h4>
            <p>Resource Packs</p>
        </div>
        <div class="stat-card">
            <h4>${formatFileSize(totalSize)}</h4>
            <p>Tamanho Total</p>
        </div>
    `;
    
    if (totalUnknown > 0) {
        statsHTML += `
        <div class="stat-card unknown-stat">
            <h4>${totalUnknown}</h4>
            <p>Packs Desconhecidos</p>
        </div>
        `;
    }
    
    if (corruptedCount > 0) {
        statsHTML += `
        <div class="stat-card" style="border-left-color: #ff9800;">
            <h4 style="color: #ff9800;">${corruptedCount}</h4>
            <p>Com Manifest Inválido</p>
        </div>
        `;
    }
    
    resultsStats.innerHTML = statsHTML;
    
    renderActivationOptions();
}

async function handleAdditionalAddons(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    try {
        progressSection.style.display = 'block';
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const progress = ((i + 1) / files.length) * 100;
            updateProgress(progress, `Adicionando ${file.name}...`);
            await processAddonFile(file);
        }
        
        updateProgress(100, 'Addons adicionados!');
        setTimeout(() => {
            progressSection.style.display = 'none';
            showResults();
        }, 1000);
        
    } catch (error) {
        console.error('Erro ao adicionar addons:', error);
        alert('Erro ao adicionar addons: ' + error.message);
        progressSection.style.display = 'none';
    }
    
    e.target.value = '';
}

function renderActivationOptions() {
    let html = '';
    
    const corruptedPacks = [
        ...state.processedAddons.behaviorPacks,
        ...state.processedAddons.resourcePacks,
        ...state.processedAddons.unknownPacks,
    ].filter(p => p.hasCorruptedManifest || !p?.manifest?.header?.uuid || !Array.isArray(p?.manifest?.header?.version));

    const allPacks = [
        ...state.processedAddons.behaviorPacks.map(p => ({...p, _type:'behavior'})),
        ...state.processedAddons.resourcePacks.map(p => ({...p, _type:'resource'})),
        ...state.processedAddons.unknownPacks.map(p => ({...p, _type:'unknown'})),
    ];
    const dupGroups = {};
    allPacks.forEach(p => {
        const uuid = p?.manifest?.header?.uuid || `no-uuid:${p.name}`;
        dupGroups[uuid] = dupGroups[uuid] || [];
        dupGroups[uuid].push(p);
    });
    const duplicateSets = Object.values(dupGroups).filter(arr => arr.length > 1);

    if (corruptedPacks.length > 0 || duplicateSets.length > 0) {
        html += `
        <div class="activation-alerts">
            ${corruptedPacks.length > 0 ? `
            <div class="alert warning">
                <strong>⚠️ Aviso:</strong> ${corruptedPacks.length} pack(s) com manifest corrompido ou incompleto.
                <span class="hint">Você pode editar UUID/Versão nos itens indicados.</span>
            </div>` : ''}
            ${duplicateSets.length > 0 ? `
            <div class="alert info">
                <strong>ℹ️ Duplicados detectados:</strong> ${duplicateSets.length} grupo(s) de addons com mesmo UUID/nome.
                <button class="btn-secondary small" onclick="dedupeActivation()">Ativar apenas 1 por grupo</button>
                ${state.uiFeedback?.dedupe ? `
                <span class="dupe-status">Aplicado: ${state.uiFeedback.dedupe.changed} pack(s) desativado(s) em ${state.uiFeedback.dedupe.groups} grupo(s)</span>
                ` : ''}
            </div>` : ''}
            ${duplicateSets.length > 0 ? `
            <div class="dupe-resolver">
                <div class="dupe-resolver-title">Resolver duplicados manualmente</div>
                ${Object.entries(dupGroups)
                    .filter(([,arr]) => arr.length>1)
                    .map(([key, arr], idx) => {
                        const readableKey = key.startsWith('no-uuid:') ? 'Sem UUID' : key;
                        let activeIdx = (state.duplicateSelection && state.duplicateSelection[key] !== undefined)
                            ? state.duplicateSelection[key]
                            : undefined;
                        if (activeIdx === undefined) {
                            let activeCount = 0;
                            activeIdx = -1;
                            for (let i=0;i<arr.length;i++) {
                                const p = arr[i];
                                const act = p._type==='behavior' ? state.activationState.behaviorPacks[p._id]
                                          : p._type==='resource' ? state.activationState.resourcePacks[p._id]
                                          : state.activationState.unknownPacks[p._id];
                                if (act) {
                                    activeIdx = (activeIdx === -1) ? i : activeIdx;
                                    activeCount++;
                                }
                            }
                            if (activeCount > 1) activeIdx = -2;
                        }
                        const optionsHTML = arr.map((p,i) => {
                            const id = `dupe_${idx}_${i}`;
                            const checked = (i===activeIdx) ? 'checked' : '';
                            const label = `${p.name}${p.fromWorld ? ' 🌍' : ''}`;
                            return (
                                `<label class="dupe-option">
                                    <input type="radio" name="dupe_grp_${idx}" id="${id}" value="${i}" ${checked}
                                        onclick="resolveDuplicateChoiceByIndexEncoded('${encodeURIComponent(key)}','${encodeURIComponent(String(i))}')">
                                    <span>${label}</span>
                                </label>`
                            );
                        }).join('');
                        return (
                            `<div class="dupe-group">
                                <div class="dupe-group-header">
                                    <span class="dupe-key">Grupo ${idx+1}: ${readableKey}</span>
                                    <span class="dupe-count">(${arr.length} itens)</span>
                                </div>
                                <div class="dupe-options">
                                    ${optionsHTML}
                                    <label class="dupe-option">
                                        <input type="radio" name="dupe_grp_${idx}" id="dupe_${idx}_none" value="__none" ${activeIdx===-1 ? 'checked' : ''}
                                            onclick="resolveDuplicateNoneEncoded('${encodeURIComponent(key)}')">
                                        <span>Nenhum</span>
                                    </label>
                                    <label class="dupe-option">
                                        <input type="radio" name="dupe_grp_${idx}" id="dupe_${idx}_both" value="__both" ${activeIdx===-2 ? 'checked' : ''}
                                            onclick="resolveDuplicateBothEncoded('${encodeURIComponent(key)}')">
                                        <span>Ambos</span>
                                    </label>
                                </div>
                            </div>`
                        );
                    }).join('')}
            </div>` : ''}
        </div>`;
    }
    
    if (state.processedAddons.behaviorPacks.length > 0) {
        html += `
            <div class="pack-type-group">
                <h4>📘 Behavior Packs</h4>
                <div class="packs-list">
        `;
        
        state.processedAddons.behaviorPacks.forEach((pack, index) => {
            const packId = `behavior_${index}`;
            if (state.activationState.behaviorPacks[pack._id] === undefined) {
                state.activationState.behaviorPacks[pack._id] = true;
            }
            const isChecked = state.activationState.behaviorPacks[pack._id];
            const fromWorld = pack.fromWorld ? ' 🌍' : ' ✨';
            const originLabel = pack.fromWorld ? 'Do Mundo' : 'Novo';
            const corruptedWarning = pack.hasCorruptedManifest ? ' <span class="corrupted-badge" title="Manifest corrompido">⚠️</span>' : '';
            
            html += `
                <div class="pack-item ${pack.fromWorld ? 'from-world' : ''} ${pack.hasCorruptedManifest ? 'corrupted-manifest' : ''}">
                    <label class="pack-checkbox">
                        <input type="checkbox" 
                               id="${packId}" 
                   data-pack-id="${pack._id}"
                               data-pack-type="behavior"
                               ${isChecked ? 'checked' : ''}
                               onchange="togglePackActivation(this)">
                        <span class="pack-name">${fromWorld} ${pack.name}${corruptedWarning} <span class="chip bp">BP</span></span>
                        <span class="pack-uuid">UUID: ${pack.manifest.header.uuid}</span>
                        <span class="pack-origin">${originLabel}</span>
                        ${(!pack.manifest?.header?.uuid || !Array.isArray(pack.manifest?.header?.version)) ? `
                        <button class="btn-secondary btn-inline" onclick="openEditEssentials('${packId}','behavior')">Editar UUID/Versão</button>` : ''}
                    </label>
                    <div class="essentials-editor" id="editor_${packId}" style="display:none">
                        <div class="editor-row">
                            <label>UUID</label>
                            <input type="text" id="uuid_${packId}" value="${pack.manifest?.header?.uuid || ''}" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                        </div>
                        <div class="editor-row">
                            <label>Versão</label>
                            <input type="text" id="version_${packId}" value="${Array.isArray(pack.manifest?.header?.version) ? pack.manifest.header.version.join('.') : ''}" placeholder="1.0.0" />
                        </div>
                        <button class="btn-success btn-inline" onclick="saveEditEssentials('${packId}','behavior','${pack.name}')">Salvar</button>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    if (state.processedAddons.resourcePacks.length > 0) {
        html += `
            <div class="pack-type-group">
                <h4>🎨 Resource Packs</h4>
                <div class="packs-list">
        `;
        
        state.processedAddons.resourcePacks.forEach((pack, index) => {
            const packId = `resource_${index}`;
            if (state.activationState.resourcePacks[pack._id] === undefined) {
                state.activationState.resourcePacks[pack._id] = true;
            }
            const isChecked = state.activationState.resourcePacks[pack._id];
            const fromWorld = pack.fromWorld ? ' 🌍' : ' ✨';
            const originLabel = pack.fromWorld ? 'Do Mundo' : 'Novo';
            const corruptedWarning = pack.hasCorruptedManifest ? ' <span class="corrupted-badge" title="Manifest corrompido">⚠️</span>' : '';
            
            html += `
                <div class="pack-item ${pack.fromWorld ? 'from-world' : ''} ${pack.hasCorruptedManifest ? 'corrupted-manifest' : ''}">
                    <label class="pack-checkbox">
                        <input type="checkbox" 
                               id="${packId}" 
                   data-pack-id="${pack._id}"
                               data-pack-type="resource"
                               ${isChecked ? 'checked' : ''}
                               onchange="togglePackActivation(this)">
                        <span class="pack-name">${fromWorld} ${pack.name}${corruptedWarning} <span class="chip rp">RP</span></span>
                        <span class="pack-uuid">UUID: ${pack.manifest.header.uuid}</span>
                        <span class="pack-origin">${originLabel}</span>
                        ${(!pack.manifest?.header?.uuid || !Array.isArray(pack.manifest?.header?.version)) ? `
                        <button class="btn-secondary btn-inline" onclick="openEditEssentials('${packId}','resource')">Editar UUID/Versão</button>` : ''}
                    </label>
                    <div class="essentials-editor" id="editor_${packId}" style="display:none">
                        <div class="editor-row">
                            <label>UUID</label>
                            <input type="text" id="uuid_${packId}" value="${pack.manifest?.header?.uuid || ''}" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                        </div>
                        <div class="editor-row">
                            <label>Versão</label>
                            <input type="text" id="version_${packId}" value="${Array.isArray(pack.manifest?.header?.version) ? pack.manifest.header.version.join('.') : ''}" placeholder="1.0.0" />
                        </div>
                        <button class="btn-success btn-inline" onclick="saveEditEssentials('${packId}','resource','${pack.name}')">Salvar</button>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    if (state.processedAddons.unknownPacks.length > 0) {
        html += `
            <div class="pack-type-group unknown-packs-group">
                <h4>❓ Packs Desconhecidos</h4>
                <p class="unknown-packs-description">
                    Estes packs não puderam ser identificados automaticamente. 
                    ${state.processedAddons.unknownPacks.some(p => p.fromWorld) ? 
                        'Packs do mundo serão mantidos na pasta original.' : 
                        'Selecione o tipo para cada pack.'}
                </p>
                <div class="packs-list">
        `;
        
        state.processedAddons.unknownPacks.forEach((pack, index) => {
            const packId = `unknown_${index}`;
            if (state.activationState.unknownPacks[pack._id] === undefined) {
                state.activationState.unknownPacks[pack._id] = true;
            }
            const isChecked = state.activationState.unknownPacks[pack._id];
            const fromWorld = pack.fromWorld ? ' 🌍' : ' ❓';
            const originLabel = pack.fromWorld ? 'Do Mundo (pasta original)' : 'Novo (precisa categorização)';
            const corruptedWarning = pack.hasCorruptedManifest ? ' <span class="corrupted-badge" title="Manifest corrompido - criado automaticamente">⚠️</span>' : '';
            
            html += `
                <div class="pack-item unknown-pack ${pack.fromWorld ? 'from-world' : 'needs-category'} ${pack.hasCorruptedManifest ? 'corrupted-manifest' : ''}">
                    <label class="pack-checkbox">
                        <input type="checkbox" 
                               id="${packId}" 
                   data-pack-id="${pack._id}"
                               data-pack-type="unknown"
                               ${isChecked ? 'checked' : ''}
                               onchange="togglePackActivation(this)">
                        <span class="pack-name">${fromWorld} ${pack.name}${corruptedWarning} <span class="chip unk">?</span></span>
                        <span class="pack-uuid">UUID: ${pack.manifest.header.uuid}</span>
                        <span class="pack-origin">${originLabel}</span>
                        ${(!pack.manifest?.header?.uuid || !Array.isArray(pack.manifest?.header?.version)) && !pack.fromWorld ? `
                        <button class="btn-secondary btn-inline" onclick="openEditEssentials('${packId}','unknown')">Editar UUID/Versão</button>` : ''}
                    </label>
                    <div class="essentials-editor" id="editor_${packId}" style="display:none">
                        <div class="editor-row">
                            <label>UUID</label>
                            <input type="text" id="uuid_${packId}" value="${pack.manifest?.header?.uuid || ''}" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                        </div>
                        <div class="editor-row">
                            <label>Versão</label>
                            <input type="text" id="version_${packId}" value="${Array.isArray(pack.manifest?.header?.version) ? pack.manifest.header.version.join('.') : ''}" placeholder="1.0.0" />
                        </div>
                        <button class="btn-success btn-inline" onclick="saveEditEssentials('${packId}','unknown','${pack.name}')">Salvar</button>
                    </div>
            `;
            
            if (!pack.fromWorld && pack.needsCategory) {
                html += `
                    <div class="category-selector">
                        <label for="category_${packId}">Categorizar como:</label>
                        <select id="category_${packId}" 
                                data-pack-index="${index}"
                                onchange="categorizeUnknownPack(this)">
                            <option value="">-- Selecione --</option>
                            <option value="behavior">Behavior Pack</option>
                            <option value="resource">Resource Pack</option>
                        </select>
                    </div>
                `;
            }
            
            html += `
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    if (html === '') {
        html = '<p class="no-packs">Nenhum addon processado.</p>';
    }
    
    packsActivation.innerHTML = html;
}

function togglePackActivation(checkbox) {
    const packId = checkbox.dataset.packId;
    const packType = checkbox.dataset.packType;
    
    if (packType === 'behavior') {
        state.activationState.behaviorPacks[packId] = checkbox.checked;
    } else if (packType === 'resource') {
        state.activationState.resourcePacks[packId] = checkbox.checked;
    } else if (packType === 'unknown') {
        state.activationState.unknownPacks[packId] = checkbox.checked;
    }
}

function openEditEssentials(packId, packType) {
    const editor = document.getElementById(`editor_${packId}`);
    if (!editor) return;
    editor.style.display = editor.style.display === 'none' ? 'block' : 'none';
}

function saveEditEssentials(packId, packType, packName) {
    const uuidInput = document.getElementById(`uuid_${packId}`);
    const versionInput = document.getElementById(`version_${packId}`);
    const uuid = uuidInput?.value?.trim();
    const versionStr = versionInput?.value?.trim();

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(uuid)) {
        alert('UUID inválido. Use o formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
        return;
    }
    const verParts = (versionStr || '').split('.').map(n => parseInt(n, 10)).filter(n => !isNaN(n));
    if (verParts.length !== 3) {
        alert('Versão inválida. Use o formato major.minor.patch (ex: 1.0.0)');
        return;
    }

    const list = packType === 'behavior' ? state.processedAddons.behaviorPacks
              : packType === 'resource' ? state.processedAddons.resourcePacks
              : state.processedAddons.unknownPacks;
    const pack = list.find(p => p.name === packName);
    if (!pack) return;

    pack.manifest = pack.manifest || { header: {} };
    pack.manifest.header = pack.manifest.header || {};
    pack.manifest.header.uuid = uuid;
    pack.manifest.header.version = verParts;

    const editor = document.getElementById(`editor_${packId}`);
    if (editor) editor.style.display = 'none';
    renderActivationOptions();
}

function dedupeActivation() {
    const all = [
        ...state.processedAddons.behaviorPacks.map(p => ({...p, _t:'behavior'})),
        ...state.processedAddons.resourcePacks.map(p => ({...p, _t:'resource'})),
        ...state.processedAddons.unknownPacks.map(p => ({...p, _t:'unknown'})),
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
                    const was = !!target[id];
                    target[id] = true;
                } else {
                    const was = !!target[id];
                    if (was !== false) changed++;
                    target[id] = false;
                }
            });
        }
    });
    state.uiFeedback = state.uiFeedback || {};
    state.uiFeedback.dedupe = { changed, groups: groupsCount, ts: Date.now() };
    renderActivationOptions();
    setTimeout(() => {
        const btns = document.querySelectorAll('.activation-alerts .btn-secondary.small');
        btns.forEach(b => { b.classList.add('btn-applied'); setTimeout(() => b.classList.remove('btn-applied'), 1000); });
    }, 0);
}

function resolveDuplicateChoiceByIndex(groupKey, indexInGroup) {
    const all = [
        ...state.processedAddons.behaviorPacks.map(p => ({...p, _t:'behavior'})),
        ...state.processedAddons.resourcePacks.map(p => ({...p, _t:'resource'})),
        ...state.processedAddons.unknownPacks.map(p => ({...p, _t:'unknown'})),
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
    renderActivationOptions();
}

function resolveDuplicateChoiceByIndexEncoded(encodedGroupKey, encodedIndex) {
    try {
        const k = decodeURIComponent(encodedGroupKey);
        const i = decodeURIComponent(encodedIndex);
        resolveDuplicateChoiceByIndex(k, i);
    } catch (e) {
        console.error('Erro ao decodificar escolha de duplicado (índice):', e);
    }
}

function resolveDuplicateNone(groupKey) {
    const all = [
        ...state.processedAddons.behaviorPacks.map(p => ({...p, _t:'behavior'})),
        ...state.processedAddons.resourcePacks.map(p => ({...p, _t:'resource'})),
        ...state.processedAddons.unknownPacks.map(p => ({...p, _t:'unknown'})),
    ];
    const matches = all.filter(p => (p?.manifest?.header?.uuid || `no-uuid:${p.name}`) === groupKey);
    state.duplicateSelection[groupKey] = -1;
    matches.forEach(p => {
        const target = p._t === 'behavior' ? state.activationState.behaviorPacks
                      : p._t === 'resource' ? state.activationState.resourcePacks
                      : state.activationState.unknownPacks;
        target[p._id] = false;
    });
    renderActivationOptions();
}

function resolveDuplicateNoneEncoded(encodedGroupKey) {
    try {
        const k = decodeURIComponent(encodedGroupKey);
        resolveDuplicateNone(k);
    } catch (e) {
        console.error('Erro ao decodificar (nenhum):', e);
    }
}

function resolveDuplicateBoth(groupKey) {
    const all = [
        ...state.processedAddons.behaviorPacks.map(p => ({...p, _t:'behavior'})),
        ...state.processedAddons.resourcePacks.map(p => ({...p, _t:'resource'})),
        ...state.processedAddons.unknownPacks.map(p => ({...p, _t:'unknown'})),
    ];
    const matches = all.filter(p => (p?.manifest?.header?.uuid || `no-uuid:${p.name}`) === groupKey);
    state.duplicateSelection[groupKey] = -2;
    matches.forEach(p => {
        const target = p._t === 'behavior' ? state.activationState.behaviorPacks
                      : p._t === 'resource' ? state.activationState.resourcePacks
                      : state.activationState.unknownPacks;
        target[p._id] = true;
    });
    renderActivationOptions();
}

function resolveDuplicateBothEncoded(encodedGroupKey) {
    try {
        const k = decodeURIComponent(encodedGroupKey);
        resolveDuplicateBoth(k);
    } catch (e) {
        console.error('Erro ao decodificar (ambos):', e);
    }
}

function categorizeUnknownPack(selectElement) {
    const packIndex = parseInt(selectElement.dataset.packIndex);
    const newCategory = selectElement.value;
    
    if (!newCategory || packIndex === undefined) {
        return;
    }
    
    const pack = state.processedAddons.unknownPacks[packIndex];
    
    if (!pack) {
        console.error(`❌ Pack não encontrado no índice ${packIndex}`);
        return;
    }
    
    console.log(`📝 Movendo pack "${pack.name}" para categoria: ${newCategory}`);
    
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
    
    renderActivationOptions();
    
    console.log(`✅ Pack "${pack.name}" categorizado com sucesso`);
}

function selectAllPacks() {
    document.querySelectorAll('.pack-checkbox input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = true;
        togglePackActivation(checkbox);
    });
}

function deselectAllPacks() {
    document.querySelectorAll('.pack-checkbox input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
        togglePackActivation(checkbox);
    });
}

function formatPacksJson(packs) {
    if (packs.length === 0) return '[\n\t\n]';
    
    let json = '[\n\t\n';
    
    packs.forEach((pack, index) => {
        json += '\t{\n';
        json += `\t\t"pack_id" : "${pack.pack_id}",\n`;
        json += `\t\t"version" : [ ${pack.version.join(', ')} ]\n`;
        json += '\t}';
        
        if (index < packs.length - 1) {
            json += ',';
        }
        
        json += '\n';
    });
    
    json += ']';
    return json;
}

function generateBehaviorPacksActivation() {
    const activePacks = [];
    
    state.processedAddons.behaviorPacks.forEach(pack => {
        if (state.activationState.behaviorPacks[pack._id]) {
            const uuid = pack?.manifest?.header?.uuid;
            const version = pack?.manifest?.header?.version;
            if (uuid && Array.isArray(version) && version.length === 3) {
                activePacks.push({ pack_id: uuid, version });
            } else {
                console.warn(`⚠️ Pack '${pack.name}' sem dados suficientes para ativação (uuid/version ausentes)`);
            }
        }
    });
    
    return activePacks;
}

function generateResourcePacksActivation() {
    const activePacks = [];
    
    state.processedAddons.resourcePacks.forEach(pack => {
        if (state.activationState.resourcePacks[pack._id]) {
            const uuid = pack?.manifest?.header?.uuid;
            const version = pack?.manifest?.header?.version;
            if (uuid && Array.isArray(version) && version.length === 3) {
                activePacks.push({ pack_id: uuid, version });
            } else {
                console.warn(`⚠️ Pack '${pack.name}' sem dados suficientes para ativação (uuid/version ausentes)`);
            }
        }
    });
    
    return activePacks;
}

async function downloadOrganizedAddons() {
    const startTime = Date.now();
    
    try {
        downloadBtn.disabled = true;
        downloadBtn.classList.add('btn-loading');
        downloadBtn.innerHTML = '<span>⏳ Preparando...</span>';
        
        const finalZip = new JSZip();
        
        const totalPacks = state.processedAddons.behaviorPacks.length + 
                          state.processedAddons.resourcePacks.length + 
                          state.processedAddons.unknownPacks.length;
        let processedPacks = 0;
        
        for (const pack of state.processedAddons.behaviorPacks) {
            let targetPath;
            if (pack.fromNestedZip) {
                // Addons de ZIP aninhado: usar behavior_packs/NomeDoAddon/
                targetPath = `behavior_packs/${sanitizeFolderName(pack.name)}/`;
            } else if (pack.fromWorld && pack.originalPath) {
                targetPath = pack.originalPath;
            } else {
                targetPath = `behavior_packs/${sanitizeFolderName(pack.name)}/`;
            }
            const packFolder = finalZip.folder(targetPath.replace(/\\/g,'/'));
            for (const [filePath, fileBlob] of Object.entries(pack.files)) {
                packFolder.file(filePath, fileBlob);
            }
            processedPacks++;
            downloadBtn.innerHTML = `<span>⏳ ${Math.round((processedPacks/totalPacks)*100)}%</span>`;
        }
        
        for (const pack of state.processedAddons.resourcePacks) {
            let targetPath;
            if (pack.fromNestedZip) {
                // Addons de ZIP aninhado: usar resource_packs/NomeDoAddon/
                targetPath = `resource_packs/${sanitizeFolderName(pack.name)}/`;
            } else if (pack.fromWorld && pack.originalPath) {
                targetPath = pack.originalPath;
            } else {
                targetPath = `resource_packs/${sanitizeFolderName(pack.name)}/`;
            }
            const packFolder = finalZip.folder(targetPath.replace(/\\/g,'/'));
            for (const [filePath, fileBlob] of Object.entries(pack.files)) {
                packFolder.file(filePath, fileBlob);
            }
            processedPacks++;
            downloadBtn.innerHTML = `<span>⏳ ${Math.round((processedPacks/totalPacks)*100)}%</span>`;
        }
        
        for (const pack of state.processedAddons.unknownPacks) {
            if (pack.fromWorld && pack.originalPath) {
                console.log(`📌 Mantendo pack "${pack.name}" na pasta original: ${pack.originalPath}`);
                const packFolder = finalZip.folder(pack.originalPath.replace(/\\/g,'/'));
                
                for (const [filePath, fileBlob] of Object.entries(pack.files)) {
                    packFolder.file(filePath, fileBlob);
                }
            } else {
                console.warn(`⚠️ Pack "${pack.name}" não categorizado, adicionando a "unknown_packs/"`);
                const packFolder = finalZip.folder(`unknown_packs/${sanitizeFolderName(pack.name)}`);
                
                for (const [filePath, fileBlob] of Object.entries(pack.files)) {
                    packFolder.file(filePath, fileBlob);
                }
            }
            processedPacks++;
        }
        
        const behaviorActivation = generateBehaviorPacksActivation();
        const resourceActivation = generateResourcePacksActivation();
        
        const behaviorJson = formatPacksJson(behaviorActivation);
        finalZip.file('world_behavior_packs.json', behaviorJson);
        
        const resourceJson = formatPacksJson(resourceActivation);
        finalZip.file('world_resource_packs.json', resourceJson);
        
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
        
        const timestamp = new Date().toISOString().slice(0,10);
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
        
        downloadBtn.disabled = false;
        downloadBtn.classList.remove('btn-loading');
        downloadBtn.innerHTML = `<span id="downloadBtnText">📥 Baixar Addons Organizados</span>`;
        
    } catch (error) {
        console.error('Erro ao gerar ZIP:', error);
        showToast(`❌ Erro ao gerar: ${error.message}`, 'error', 5000);
        hapticFeedback('error');
        downloadBtn.disabled = false;
        downloadBtn.classList.remove('btn-loading');
        downloadBtn.innerHTML = `<span id="downloadBtnText">📥 Baixar Addons Organizados</span>`;
    }
}

function sanitizeFolderName(name) {
    return name
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 100); // Limitar tamanho
}
