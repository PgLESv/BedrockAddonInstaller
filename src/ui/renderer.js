import { state } from '../core/state.js';
import { elements } from './elements.js';
import { escapeHtml } from '../utils/security.js';
import { formatFileSize, truncateName, getFileIcon } from '../utils/formatters.js';

export function updateActionsVisibility() {
    elements.actions.style.display = state.uploadedFiles.length > 0 ? 'flex' : 'none';
}

export function updateProgress(percentage, text) {
    elements.progressFill.style.width = percentage + '%';
    elements.progressText.textContent = text;
}

export function calculateTotalSize() {
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

export function renderFilesList() {
    if (state.uploadedFiles.length === 0) {
        elements.filesList.innerHTML = '';
        return;
    }
    
    elements.filesList.innerHTML = state.uploadedFiles.map((file, index) => {
        const safeName = escapeHtml(file.name);
        const safeTruncated = escapeHtml(truncateName(file.name));
        return `
        <div class="file-item" role="listitem">
            <div class="file-info">
                <span class="file-icon" aria-hidden="true">${getFileIcon(file.name)}</span>
                <div class="file-details">
                    <h4 title="${safeName}">${safeTruncated}</h4>
                    <p>${formatFileSize(file.size)}</p>
                </div>
            </div>
            <button class="file-remove" data-index="${index}" aria-label="Remover ${safeName}">
                <span aria-hidden="true">✕</span> Remover
            </button>
        </div>
        `;
    }).join('');
}

export function showResults() {
    elements.progressSection.style.display = 'none';
    elements.resultsSection.style.display = 'block';

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
        elements.resultsTitle.textContent = '🌍 Gerenciamento de Mundo';
        elements.worldInfo.style.display = 'block';
        elements.worldName.textContent = state.worldData.name;
        elements.worldManagement.style.display = 'block';
        elements.downloadBtnText.textContent = '📥 Baixar Apenas Addons (sem o mapa)';
        elements.activationTitle.textContent = '⚙️ Gerenciar Addons do Mundo';
        elements.activationDescription.textContent = 'Marque os addons que deseja manter ativos. Desmarcados serão removidos da ativação.';
    } else {
        elements.resultsTitle.textContent = '✅ Processamento Concluído!';
        elements.worldInfo.style.display = 'none';
        elements.worldManagement.style.display = 'none';
        elements.downloadBtnText.textContent = '📥 Baixar Addons Organizados';
        elements.activationTitle.textContent = '⚙️ Ativar Addons';
        elements.activationDescription.textContent = 'Selecione quais addons devem ser ativados automaticamente no mundo';
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

    elements.resultsStats.innerHTML = statsHTML;
    renderActivationOptions();
}

export function renderActivationOptions() {
    let html = '';

    const corruptedPacks = [
        ...state.processedAddons.behaviorPacks,
        ...state.processedAddons.resourcePacks,
        ...state.processedAddons.unknownPacks,
    ].filter(p => p.hasCorruptedManifest || !p?.manifest?.header?.uuid || !Array.isArray(p?.manifest?.header?.version));

    const allPacks = [
        ...state.processedAddons.behaviorPacks.map(p => ({ ...p, _type: 'behavior' })),
        ...state.processedAddons.resourcePacks.map(p => ({ ...p, _type: 'resource' })),
        ...state.processedAddons.unknownPacks.map(p => ({ ...p, _type: 'unknown' })),
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
                <button class="btn-secondary small btn-dedupe" id="btnDedupeAction">Ativar apenas 1 por grupo</button>
                ${state.uiFeedback?.dedupe ? `
                <span class="dupe-status">Aplicado: ${state.uiFeedback.dedupe.changed} pack(s) desativado(s) em ${state.uiFeedback.dedupe.groups} grupo(s)</span>
                ` : ''}
            </div>` : ''}
            ${duplicateSets.length > 0 ? `
            <div class="dupe-resolver">
                <div class="dupe-resolver-title">Resolver duplicados manualmente</div>
                ${Object.entries(dupGroups)
                    .filter(([, arr]) => arr.length > 1)
                    .map(([key, arr], idx) => {
                        const readableKey = key.startsWith('no-uuid:') ? 'Sem UUID' : key;
                        let activeIdx = (state.duplicateSelection && state.duplicateSelection[key] !== undefined)
                            ? state.duplicateSelection[key]
                            : undefined;
                        if (activeIdx === undefined) {
                            let activeCount = 0;
                            activeIdx = -1;
                            for (let i = 0; i < arr.length; i++) {
                                const p = arr[i];
                                const act = p._type === 'behavior' ? state.activationState.behaviorPacks[p._id]
                                          : p._type === 'resource' ? state.activationState.resourcePacks[p._id]
                                          : state.activationState.unknownPacks[p._id];
                                if (act) {
                                    activeIdx = (activeIdx === -1) ? i : activeIdx;
                                    activeCount++;
                                }
                            }
                            if (activeCount > 1) activeIdx = -2;
                        }
                        const optionsHTML = arr.map((p, i) => {
                            const id = `dupe_${idx}_${i}`;
                            const checked = (i === activeIdx) ? 'checked' : '';
                            const label = `${escapeHtml(p.name)}${p.fromWorld ? ' 🌍' : ''}`;
                            return (
                                `<label class="dupe-option">
                                    <input type="radio" name="dupe_grp_${idx}" id="${id}" value="${i}" ${checked}
                                        data-group-key="${escapeHtml(key)}" data-index="${i}" class="dupe-radio-choice">
                                    <span>${label}</span>
                                </label>`
                            );
                        }).join('');
                        return (
                            `<div class="dupe-group">
                                <div class="dupe-group-header">
                                    <span class="dupe-key">Grupo ${idx + 1}: ${escapeHtml(readableKey)}</span>
                                    <span class="dupe-count">(${arr.length} itens)</span>
                                </div>
                                <div class="dupe-options">
                                    ${optionsHTML}
                                    <label class="dupe-option">
                                        <input type="radio" name="dupe_grp_${idx}" id="dupe_${idx}_none" value="__none" ${activeIdx === -1 ? 'checked' : ''}
                                            data-group-key="${escapeHtml(key)}" class="dupe-radio-none">
                                        <span>Nenhum</span>
                                    </label>
                                    <label class="dupe-option">
                                        <input type="radio" name="dupe_grp_${idx}" id="dupe_${idx}_both" value="__both" ${activeIdx === -2 ? 'checked' : ''}
                                            data-group-key="${escapeHtml(key)}" class="dupe-radio-both">
                                        <span>Ambos</span>
                                    </label>
                                </div>
                            </div>`
                        );
                    }).join('')}
            </div>` : ''}
        </div>`;
    }

    function renderPackGroup(typeKey, title, packs, chipClass, chipLabel) {
        if (!packs || packs.length === 0) return '';
        let section = `
            <div class="pack-type-group ${typeKey === 'unknown' ? 'unknown-packs-group' : ''}">
                <h4>${title}</h4>
                ${typeKey === 'unknown' ? `
                <p class="unknown-packs-description">
                    Estes packs não puderam ser identificados automaticamente. 
                    ${packs.some(p => p.fromWorld) ? 'Packs do mundo serão mantidos na pasta original.' : 'Selecione o tipo para cada pack.'}
                </p>` : ''}
                <div class="packs-list">
        `;

        packs.forEach((pack, index) => {
            const packDomId = `${typeKey}_${index}`;
            const targetState = typeKey === 'behavior' ? state.activationState.behaviorPacks
                              : typeKey === 'resource' ? state.activationState.resourcePacks
                              : state.activationState.unknownPacks;
            if (targetState[pack._id] === undefined) {
                targetState[pack._id] = true;
            }
            const isChecked = targetState[pack._id];
            const fromWorld = pack.fromWorld ? ' 🌍' : (typeKey === 'unknown' ? ' ❓' : ' ✨');
            const originLabel = pack.fromWorld 
                ? (typeKey === 'unknown' ? 'Do Mundo (pasta original)' : 'Do Mundo') 
                : (typeKey === 'unknown' ? 'Novo (precisa categorização)' : 'Novo');
            const corruptedWarning = pack.hasCorruptedManifest ? ' <span class="corrupted-badge" title="Manifest corrompido">⚠️</span>' : '';

            let valBadgeHTML = '';
            let valDetailsHTML = '';
            if (pack.validation) {
                const hasErrors = pack.validation.errors && pack.validation.errors.length > 0;
                const hasWarnings = pack.validation.warnings && pack.validation.warnings.length > 0;

                if (hasErrors) {
                    valBadgeHTML = ` <span class="validation-badge val-error" title="${escapeHtml(pack.validation.errors.join('\n'))}">❌ ${pack.validation.errors.length} erro${pack.validation.errors.length > 1 ? 's' : ''}</span>`;
                } else if (hasWarnings) {
                    valBadgeHTML = ` <span class="validation-badge val-warning" title="${escapeHtml(pack.validation.warnings.join('\n'))}">⚠️ ${pack.validation.warnings.length} aviso${pack.validation.warnings.length > 1 ? 's' : ''}</span>`;
                }

                if (hasErrors || hasWarnings) {
                    valDetailsHTML = `
                    <details class="validation-details ${hasErrors ? 'has-errors' : ''}">
                        <summary class="validation-summary ${hasErrors ? 'has-errors' : 'has-warnings'}">
                            ${hasErrors 
                                ? `❌ Problemas de schema no manifest (${pack.validation.errors.length})` 
                                : `⚠️ Avisos de compatibilidade (${pack.validation.warnings.length})`}
                        </summary>
                        <ul class="validation-list">
                            ${pack.validation.errors.map(err => `<li class="val-err">${escapeHtml(err)}</li>`).join('')}
                            ${pack.validation.warnings.map(warn => `<li class="val-warn">${escapeHtml(warn)}</li>`).join('')}
                        </ul>
                    </details>
                    `;
                }
            }

            section += `
                <div class="pack-item ${typeKey === 'unknown' ? 'unknown-pack' : ''} ${pack.fromWorld ? 'from-world' : (typeKey === 'unknown' ? 'needs-category' : '')} ${pack.hasCorruptedManifest ? 'corrupted-manifest' : ''}">
                    <div class="pack-main-row">
                        <label class="pack-checkbox" for="${packDomId}">
                            <input type="checkbox" 
                                   id="${packDomId}" 
                                   data-pack-id="${pack._id}"
                                   data-pack-type="${typeKey}"
                                   class="pack-activation-check"
                                   ${isChecked ? 'checked' : ''}>
                            <span class="pack-name">${fromWorld} ${escapeHtml(pack.name)}${corruptedWarning} <span class="chip ${chipClass}">${chipLabel}</span>${valBadgeHTML}</span>
                            <span class="pack-uuid">UUID: ${escapeHtml(pack.manifest?.header?.uuid || 'Sem UUID')}</span>
                            <span class="pack-origin">${originLabel}</span>
                        </label>
                        <div class="pack-actions">
                            ${(!pack.manifest?.header?.uuid || !Array.isArray(pack.manifest?.header?.version)) && (!pack.fromWorld || typeKey !== 'unknown') ? `
                            <button type="button" class="btn-inline btn-toggle-edit" data-editor-id="editor_${packDomId}" title="Editar UUID/Versão">✏️ UUID/Versão</button>` : ''}
                            <button type="button" class="btn-inline btn-download-pack" data-pack-id="${pack._id}" title="Baixar este addon como .mcpack individual">📥 .mcpack</button>
                        </div>
                    </div>
                    ${valDetailsHTML}
                    <div class="essentials-editor" id="editor_${packDomId}" style="display:none">
                        <div class="editor-row">
                            <label>UUID</label>
                            <input type="text" id="uuid_${packDomId}" value="${escapeHtml(pack.manifest?.header?.uuid || '')}" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                        </div>
                        <div class="editor-row">
                            <label>Versão</label>
                            <input type="text" id="version_${packDomId}" value="${escapeHtml(Array.isArray(pack.manifest?.header?.version) ? pack.manifest.header.version.join('.') : '')}" placeholder="1.0.0" />
                        </div>
                        <button type="button" class="btn-success btn-inline btn-save-essentials" data-pack-dom-id="${packDomId}" data-pack-type="${typeKey}" data-internal-id="${pack._id}">Salvar</button>
                    </div>
            `;

            if (typeKey === 'unknown' && !pack.fromWorld && pack.needsCategory) {
                section += `
                    <div class="category-selector">
                        <label for="category_${packDomId}">Categorizar como:</label>
                        <select id="category_${packDomId}" data-pack-index="${index}" class="select-category">
                            <option value="">-- Selecione --</option>
                            <option value="behavior">Behavior Pack</option>
                            <option value="resource">Resource Pack</option>
                        </select>
                    </div>
                `;
            }

            section += `</div>`;
        });

        section += `</div></div>`;
        return section;
    }

    html += renderPackGroup('behavior', '📘 Behavior Packs', state.processedAddons.behaviorPacks, 'bp', 'BP');
    html += renderPackGroup('resource', '🎨 Resource Packs', state.processedAddons.resourcePacks, 'rp', 'RP');
    html += renderPackGroup('unknown', '❓ Packs Desconhecidos', state.processedAddons.unknownPacks, 'unk', '?');

    if (html === '') {
        html = '<p class="no-packs">Nenhum addon processado.</p>';
    }

    elements.packsActivation.innerHTML = html;
}
