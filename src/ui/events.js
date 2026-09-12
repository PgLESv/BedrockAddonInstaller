import { CONFIG } from '../core/config.js';
import { state, clearState, resetProcessedAddons } from '../core/state.js';
import { elements } from './elements.js';
import { showToast, hapticFeedback } from '../utils/feedback.js';
import { renderFilesList, updateActionsVisibility, updateProgress, showResults, renderActivationOptions } from './renderer.js';
import { checkIfIsWorld, processWorld } from '../services/worldService.js';
import { 
    processAddonFile, 
    togglePackActivation, 
    saveEditEssentials, 
    dedupeActivation, 
    resolveDuplicateChoiceByIndex, 
    resolveDuplicateNone, 
    resolveDuplicateBoth, 
    categorizeUnknownPack, 
    selectAllPacks, 
    deselectAllPacks 
} from '../services/packService.js';
import { downloadOrganizedAddons, downloadSinglePack } from '../services/exportService.js';

export function validateFile(file) {
    const errors = [];
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        errors.push(`Arquivo muito grande`);
    }
    if (file.size === 0) {
        errors.push('Arquivo vazio');
    }
    const fileName = file.name.toLowerCase();
    const extension = fileName.substring(fileName.lastIndexOf('.'));
    const isTarGz = fileName.endsWith('.tar.gz');
    const isValid = CONFIG.SUPPORTED_EXTENSIONS.includes(extension) || isTarGz;
    if (extension === '.rar' || extension === '.7z') {
        errors.push(`${extension} não é suportado no navegador. Extraia e envie como .zip ou .mcpack`);
    } else if (!isValid) {
        errors.push(`Extensão não suportada: ${extension}`);
    }
    return { valid: errors.length === 0, errors };
}

export async function addFiles(files) {
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

        let isWorld = extension === '.mcworld';
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
            break;
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

export function removeFile(index) {
    hapticFeedback('light');
    state.uploadedFiles.splice(index, 1);
    renderFilesList();
    updateActionsVisibility();
}

export function clearFiles() {
    clearState();
    renderFilesList();
    updateActionsVisibility();
    elements.resultsSection.style.display = 'none';
    elements.progressSection.style.display = 'none';
}

export async function processAddons() {
    if (state.uploadedFiles.length === 0) return;
    resetProcessedAddons();

    elements.progressSection.style.display = 'block';
    elements.resultsSection.style.display = 'none';
    elements.actions.style.display = 'none';

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
        elements.progressSection.style.display = 'none';
        elements.actions.style.display = 'flex';
    }
}

export async function handleAdditionalAddons(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    try {
        elements.progressSection.style.display = 'block';
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const progress = ((i + 1) / files.length) * 100;
            updateProgress(progress, `Adicionando ${file.name}...`);
            await processAddonFile(file);
        }
        updateProgress(100, 'Addons adicionados!');
        setTimeout(() => {
            elements.progressSection.style.display = 'none';
            showResults();
        }, 1000);
    } catch (error) {
        console.error('Erro ao adicionar addons:', error);
        showToast(`Erro ao adicionar addons: ${error.message}`, 'error');
        elements.progressSection.style.display = 'none';
    }
    e.target.value = '';
}

export function setupEventListeners() {
    // Drop zone
    const dropZone = elements.dropZone;
    const fileInput = elements.fileInput;
    let dragCounter = 0;

    dropZone.addEventListener('click', (e) => {
        const clicked = e.target;
        const isInteractive = clicked.tagName === 'LABEL' || clicked.tagName === 'SUMMARY' ||
            clicked.tagName === 'DETAILS' || clicked.tagName === 'A' ||
            clicked.closest('details') || clicked.closest('summary');
        if (!isInteractive) {
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
        await addFiles(Array.from(e.dataTransfer.files));
    });

    fileInput.addEventListener('change', (e) => {
        addFiles(Array.from(e.target.files));
        e.target.value = '';
    });

    // Action buttons
    elements.processBtn.addEventListener('click', () => {
        hapticFeedback('medium');
        processAddons();
    });

    elements.clearBtn.addEventListener('click', () => {
        hapticFeedback('light');
        clearFiles();
    });

    elements.downloadBtn.addEventListener('click', () => {
        hapticFeedback('success');
        downloadOrganizedAddons();
    });

    elements.selectAllBtn.addEventListener('click', () => {
        hapticFeedback('light');
        selectAllPacks();
        renderActivationOptions();
    });

    elements.deselectAllBtn.addEventListener('click', () => {
        hapticFeedback('light');
        deselectAllPacks();
        renderActivationOptions();
    });

    elements.additionalAddons.addEventListener('change', handleAdditionalAddons);

    // Event delegation on filesList
    elements.filesList.addEventListener('click', (e) => {
        const btn = e.target.closest('.file-remove');
        if (btn && btn.dataset.index !== undefined) {
            removeFile(parseInt(btn.dataset.index, 10));
        }
    });

    // Event delegation on packsActivation
    elements.packsActivation.addEventListener('click', (e) => {
        // Toggle Essentials Editor
        const toggleBtn = e.target.closest('.btn-toggle-edit');
        if (toggleBtn) {
            const editor = document.getElementById(toggleBtn.dataset.editorId);
            if (editor) {
                editor.style.display = editor.style.display === 'none' ? 'block' : 'none';
            }
            return;
        }

        // Download Individual .mcpack
        const downloadPackBtn = e.target.closest('.btn-download-pack');
        if (downloadPackBtn && downloadPackBtn.dataset.packId) {
            downloadSinglePack(downloadPackBtn.dataset.packId);
            return;
        }

        // Save Essentials
        const saveBtn = e.target.closest('.btn-save-essentials');
        if (saveBtn) {
            const { packDomId, packType, internalId } = saveBtn.dataset;
            const uuid = document.getElementById(`uuid_${packDomId}`)?.value?.trim();
            const version = document.getElementById(`version_${packDomId}`)?.value?.trim();
            if (saveEditEssentials(packDomId, packType, internalId, uuid, version)) {
                renderActivationOptions();
            }
            return;
        }

        // Dedupe Action
        const dedupeBtn = e.target.closest('#btnDedupeAction');
        if (dedupeBtn) {
            dedupeActivation();
            renderActivationOptions();
            return;
        }

        // Dupe Choice Radios
        const radioChoice = e.target.closest('.dupe-radio-choice');
        if (radioChoice) {
            resolveDuplicateChoiceByIndex(radioChoice.dataset.groupKey, radioChoice.dataset.index);
            renderActivationOptions();
            return;
        }

        const radioNone = e.target.closest('.dupe-radio-none');
        if (radioNone) {
            resolveDuplicateNone(radioNone.dataset.groupKey);
            renderActivationOptions();
            return;
        }

        const radioBoth = e.target.closest('.dupe-radio-both');
        if (radioBoth) {
            resolveDuplicateBoth(radioBoth.dataset.groupKey);
            renderActivationOptions();
            return;
        }
    });

    elements.packsActivation.addEventListener('change', (e) => {
        // Checkbox activation
        const check = e.target.closest('.pack-activation-check');
        if (check) {
            togglePackActivation(check.dataset.packId, check.dataset.packType, check.checked);
            return;
        }

        // Select category
        const select = e.target.closest('.select-category');
        if (select) {
            categorizeUnknownPack(parseInt(select.dataset.packIndex, 10), select.value);
            renderActivationOptions();
            return;
        }
    });
}
