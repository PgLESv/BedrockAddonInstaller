(() => {
  // src/core/config.js
  var CONFIG = {
    MAX_FILE_SIZE: 3 * 1024 * 1024 * 1024,
    MAX_FILES: 200,
    CACHE_TTL: 5 * 60 * 1e3,
    COMPRESSION_LEVEL: 6,
    SUPPORTED_EXTENSIONS: [".zip", ".mcpack", ".mcaddon", ".mcworld", ".tar", ".gz", ".tgz"]
  };

  // src/core/state.js
  var __packIdSeq = 0;
  function generatePackId() {
    return `pack_${Date.now()}_${__packIdSeq++}`;
  }
  var state = {
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
      decompressedFiles: /* @__PURE__ */ new Map(),
      lastCleanup: Date.now()
    }
  };
  function resetProcessedAddons() {
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
  function clearState() {
    state.uploadedFiles = [];
    resetProcessedAddons();
    state.worldMode = false;
    state.worldData = null;
    state.uiFeedback = { dedupe: null };
    state.duplicateSelection = {};
  }

  // src/ui/elements.js
  var elements = {
    get dropZone() {
      return document.getElementById("dropZone");
    },
    get fileInput() {
      return document.getElementById("fileInput");
    },
    get filesList() {
      return document.getElementById("filesList");
    },
    get actions() {
      return document.getElementById("actions");
    },
    get processBtn() {
      return document.getElementById("processBtn");
    },
    get clearBtn() {
      return document.getElementById("clearBtn");
    },
    get progressSection() {
      return document.getElementById("progressSection");
    },
    get progressFill() {
      return document.getElementById("progressFill");
    },
    get progressText() {
      return document.getElementById("progressText");
    },
    get resultsSection() {
      return document.getElementById("resultsSection");
    },
    get resultsStats() {
      return document.getElementById("resultsStats");
    },
    get downloadBtn() {
      return document.getElementById("downloadBtn");
    },
    get downloadBtnText() {
      return document.getElementById("downloadBtnText");
    },
    get packsActivation() {
      return document.getElementById("packsActivation");
    },
    get selectAllBtn() {
      return document.getElementById("selectAllBtn");
    },
    get deselectAllBtn() {
      return document.getElementById("deselectAllBtn");
    },
    get worldInfo() {
      return document.getElementById("worldInfo");
    },
    get worldName() {
      return document.getElementById("worldName");
    },
    get worldManagement() {
      return document.getElementById("worldManagement");
    },
    get additionalAddons() {
      return document.getElementById("additionalAddons");
    },
    get additionalAddonsList() {
      return document.getElementById("additionalAddonsList");
    },
    get resultsTitle() {
      return document.getElementById("resultsTitle");
    },
    get activationTitle() {
      return document.getElementById("activationTitle");
    },
    get activationDescription() {
      return document.getElementById("activationDescription");
    }
  };

  // src/utils/feedback.js
  var toastTimeout = null;
  function showToast(message, type = "info", duration = 3e3) {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    if (toastTimeout) clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.className = `toast ${type}`;
    void toast.offsetHeight;
    toast.classList.add("show");
    toastTimeout = setTimeout(() => {
      toast.classList.remove("show");
    }, duration);
  }
  function hapticFeedback(type = "light") {
    if ("vibrate" in navigator) {
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

  // src/utils/security.js
  function escapeHtml(str) {
    if (str === null || str === void 0) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function sanitizeFolderName(name) {
    return (name || "").replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, " ").trim().substring(0, 100) || "Pack";
  }

  // src/utils/formatters.js
  function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    if (!bytes || isNaN(bytes)) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  }
  function truncateName(name, maxLen = 35) {
    if (!name || name.length <= maxLen) return name || "";
    const ext = name.lastIndexOf(".");
    const extension = ext > -1 ? name.slice(ext) : "";
    const baseName = ext > -1 ? name.slice(0, ext) : name;
    const truncLen = maxLen - extension.length - 3;
    return (truncLen > 0 ? baseName.slice(0, truncLen) : baseName) + "..." + extension;
  }
  function getFileIcon(fileName) {
    const name = (fileName || "").toLowerCase();
    if (name.endsWith(".mcworld")) return "\u{1F30D}";
    if (name.endsWith(".mcpack") || name.endsWith(".mcaddon")) return "\u{1F4E6}";
    if (name.endsWith(".zip")) return "\u{1F5DC}\uFE0F";
    if (name.endsWith(".tar") || name.endsWith(".gz") || name.endsWith(".tgz")) return "\u{1F4C1}";
    return "\u{1F4C4}";
  }

  // src/ui/renderer.js
  function updateActionsVisibility() {
    elements.actions.style.display = state.uploadedFiles.length > 0 ? "flex" : "none";
  }
  function updateProgress(percentage, text) {
    elements.progressFill.style.width = percentage + "%";
    elements.progressText.textContent = text;
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
  function renderFilesList() {
    if (state.uploadedFiles.length === 0) {
      elements.filesList.innerHTML = "";
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
                <span aria-hidden="true">\u2715</span> Remover
            </button>
        </div>
        `;
    }).join("");
  }
  function showResults() {
    elements.progressSection.style.display = "none";
    elements.resultsSection.style.display = "block";
    const totalBehavior = state.processedAddons.behaviorPacks.length;
    const totalResource = state.processedAddons.resourcePacks.length;
    const totalUnknown = state.processedAddons.unknownPacks.length;
    const totalAddons = totalBehavior + totalResource + totalUnknown;
    const totalSize = calculateTotalSize();
    const corruptedCount = [
      ...state.processedAddons.behaviorPacks,
      ...state.processedAddons.resourcePacks,
      ...state.processedAddons.unknownPacks
    ].filter((p) => p.hasCorruptedManifest).length;
    if (state.worldMode && state.worldData) {
      elements.resultsTitle.textContent = "\u{1F30D} Gerenciamento de Mundo";
      elements.worldInfo.style.display = "block";
      elements.worldName.textContent = state.worldData.name;
      elements.worldManagement.style.display = "block";
      elements.downloadBtnText.textContent = "\u{1F4E5} Baixar Apenas Addons (sem o mapa)";
      elements.activationTitle.textContent = "\u2699\uFE0F Gerenciar Addons do Mundo";
      elements.activationDescription.textContent = "Marque os addons que deseja manter ativos. Desmarcados ser\xE3o removidos da ativa\xE7\xE3o.";
    } else {
      elements.resultsTitle.textContent = "\u2705 Processamento Conclu\xEDdo!";
      elements.worldInfo.style.display = "none";
      elements.worldManagement.style.display = "none";
      elements.downloadBtnText.textContent = "\u{1F4E5} Baixar Addons Organizados";
      elements.activationTitle.textContent = "\u2699\uFE0F Ativar Addons";
      elements.activationDescription.textContent = "Selecione quais addons devem ser ativados automaticamente no mundo";
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
            <p>Com Manifest Inv\xE1lido</p>
        </div>
        `;
    }
    elements.resultsStats.innerHTML = statsHTML;
    renderActivationOptions();
  }
  function renderActivationOptions() {
    let html = "";
    const corruptedPacks = [
      ...state.processedAddons.behaviorPacks,
      ...state.processedAddons.resourcePacks,
      ...state.processedAddons.unknownPacks
    ].filter((p) => p.hasCorruptedManifest || !p?.manifest?.header?.uuid || !Array.isArray(p?.manifest?.header?.version));
    const allPacks = [
      ...state.processedAddons.behaviorPacks.map((p) => ({ ...p, _type: "behavior" })),
      ...state.processedAddons.resourcePacks.map((p) => ({ ...p, _type: "resource" })),
      ...state.processedAddons.unknownPacks.map((p) => ({ ...p, _type: "unknown" }))
    ];
    const dupGroups = {};
    allPacks.forEach((p) => {
      const uuid = p?.manifest?.header?.uuid || `no-uuid:${p.name}`;
      dupGroups[uuid] = dupGroups[uuid] || [];
      dupGroups[uuid].push(p);
    });
    const duplicateSets = Object.values(dupGroups).filter((arr) => arr.length > 1);
    if (corruptedPacks.length > 0 || duplicateSets.length > 0) {
      html += `
        <div class="activation-alerts">
            ${corruptedPacks.length > 0 ? `
            <div class="alert warning">
                <strong>\u26A0\uFE0F Aviso:</strong> ${corruptedPacks.length} pack(s) com manifest corrompido ou incompleto.
                <span class="hint">Voc\xEA pode editar UUID/Vers\xE3o nos itens indicados.</span>
            </div>` : ""}
            ${duplicateSets.length > 0 ? `
            <div class="alert info">
                <strong>\u2139\uFE0F Duplicados detectados:</strong> ${duplicateSets.length} grupo(s) de addons com mesmo UUID/nome.
                <button class="btn-secondary small btn-dedupe" id="btnDedupeAction">Ativar apenas 1 por grupo</button>
                ${state.uiFeedback?.dedupe ? `
                <span class="dupe-status">Aplicado: ${state.uiFeedback.dedupe.changed} pack(s) desativado(s) em ${state.uiFeedback.dedupe.groups} grupo(s)</span>
                ` : ""}
            </div>` : ""}
            ${duplicateSets.length > 0 ? `
            <div class="dupe-resolver">
                <div class="dupe-resolver-title">Resolver duplicados manualmente</div>
                ${Object.entries(dupGroups).filter(([, arr]) => arr.length > 1).map(([key, arr], idx) => {
        const readableKey = key.startsWith("no-uuid:") ? "Sem UUID" : key;
        let activeIdx = state.duplicateSelection && state.duplicateSelection[key] !== void 0 ? state.duplicateSelection[key] : void 0;
        if (activeIdx === void 0) {
          let activeCount = 0;
          activeIdx = -1;
          for (let i = 0; i < arr.length; i++) {
            const p = arr[i];
            const act = p._type === "behavior" ? state.activationState.behaviorPacks[p._id] : p._type === "resource" ? state.activationState.resourcePacks[p._id] : state.activationState.unknownPacks[p._id];
            if (act) {
              activeIdx = activeIdx === -1 ? i : activeIdx;
              activeCount++;
            }
          }
          if (activeCount > 1) activeIdx = -2;
        }
        const optionsHTML = arr.map((p, i) => {
          const id = `dupe_${idx}_${i}`;
          const checked = i === activeIdx ? "checked" : "";
          const label = `${escapeHtml(p.name)}${p.fromWorld ? " \u{1F30D}" : ""}`;
          return `<label class="dupe-option">
                                    <input type="radio" name="dupe_grp_${idx}" id="${id}" value="${i}" ${checked}
                                        data-group-key="${escapeHtml(key)}" data-index="${i}" class="dupe-radio-choice">
                                    <span>${label}</span>
                                </label>`;
        }).join("");
        return `<div class="dupe-group">
                                <div class="dupe-group-header">
                                    <span class="dupe-key">Grupo ${idx + 1}: ${escapeHtml(readableKey)}</span>
                                    <span class="dupe-count">(${arr.length} itens)</span>
                                </div>
                                <div class="dupe-options">
                                    ${optionsHTML}
                                    <label class="dupe-option">
                                        <input type="radio" name="dupe_grp_${idx}" id="dupe_${idx}_none" value="__none" ${activeIdx === -1 ? "checked" : ""}
                                            data-group-key="${escapeHtml(key)}" class="dupe-radio-none">
                                        <span>Nenhum</span>
                                    </label>
                                    <label class="dupe-option">
                                        <input type="radio" name="dupe_grp_${idx}" id="dupe_${idx}_both" value="__both" ${activeIdx === -2 ? "checked" : ""}
                                            data-group-key="${escapeHtml(key)}" class="dupe-radio-both">
                                        <span>Ambos</span>
                                    </label>
                                </div>
                            </div>`;
      }).join("")}
            </div>` : ""}
        </div>`;
    }
    function renderPackGroup(typeKey, title, packs, chipClass, chipLabel) {
      if (!packs || packs.length === 0) return "";
      let section = `
            <div class="pack-type-group ${typeKey === "unknown" ? "unknown-packs-group" : ""}">
                <h4>${title}</h4>
                ${typeKey === "unknown" ? `
                <p class="unknown-packs-description">
                    Estes packs n\xE3o puderam ser identificados automaticamente. 
                    ${packs.some((p) => p.fromWorld) ? "Packs do mundo ser\xE3o mantidos na pasta original." : "Selecione o tipo para cada pack."}
                </p>` : ""}
                <div class="packs-list">
        `;
      packs.forEach((pack, index) => {
        const packDomId = `${typeKey}_${index}`;
        const targetState = typeKey === "behavior" ? state.activationState.behaviorPacks : typeKey === "resource" ? state.activationState.resourcePacks : state.activationState.unknownPacks;
        if (targetState[pack._id] === void 0) {
          targetState[pack._id] = true;
        }
        const isChecked = targetState[pack._id];
        const fromWorld = pack.fromWorld ? " \u{1F30D}" : typeKey === "unknown" ? " \u2753" : " \u2728";
        const originLabel = pack.fromWorld ? typeKey === "unknown" ? "Do Mundo (pasta original)" : "Do Mundo" : typeKey === "unknown" ? "Novo (precisa categoriza\xE7\xE3o)" : "Novo";
        const corruptedWarning = pack.hasCorruptedManifest ? ' <span class="corrupted-badge" title="Manifest corrompido">\u26A0\uFE0F</span>' : "";
        let valBadgeHTML = "";
        let valDetailsHTML = "";
        if (pack.validation) {
          const hasErrors = pack.validation.errors && pack.validation.errors.length > 0;
          const hasWarnings = pack.validation.warnings && pack.validation.warnings.length > 0;
          if (hasErrors) {
            valBadgeHTML = ` <span class="validation-badge val-error" title="${escapeHtml(pack.validation.errors.join("\n"))}">\u274C ${pack.validation.errors.length} erro${pack.validation.errors.length > 1 ? "s" : ""}</span>`;
          } else if (hasWarnings) {
            valBadgeHTML = ` <span class="validation-badge val-warning" title="${escapeHtml(pack.validation.warnings.join("\n"))}">\u26A0\uFE0F ${pack.validation.warnings.length} aviso${pack.validation.warnings.length > 1 ? "s" : ""}</span>`;
          }
          if (hasErrors || hasWarnings) {
            valDetailsHTML = `
                    <details class="validation-details ${hasErrors ? "has-errors" : ""}">
                        <summary class="validation-summary ${hasErrors ? "has-errors" : "has-warnings"}">
                            ${hasErrors ? `\u274C Problemas de schema no manifest (${pack.validation.errors.length})` : `\u26A0\uFE0F Avisos de compatibilidade (${pack.validation.warnings.length})`}
                        </summary>
                        <ul class="validation-list">
                            ${pack.validation.errors.map((err) => `<li class="val-err">${escapeHtml(err)}</li>`).join("")}
                            ${pack.validation.warnings.map((warn) => `<li class="val-warn">${escapeHtml(warn)}</li>`).join("")}
                        </ul>
                    </details>
                    `;
          }
        }
        section += `
                <div class="pack-item ${typeKey === "unknown" ? "unknown-pack" : ""} ${pack.fromWorld ? "from-world" : typeKey === "unknown" ? "needs-category" : ""} ${pack.hasCorruptedManifest ? "corrupted-manifest" : ""}">
                    <div class="pack-main-row">
                        <label class="pack-checkbox" for="${packDomId}">
                            <input type="checkbox" 
                                   id="${packDomId}" 
                                   data-pack-id="${pack._id}"
                                   data-pack-type="${typeKey}"
                                   class="pack-activation-check"
                                   ${isChecked ? "checked" : ""}>
                            <span class="pack-name">${fromWorld} ${escapeHtml(pack.name)}${corruptedWarning} <span class="chip ${chipClass}">${chipLabel}</span>${valBadgeHTML}</span>
                            <span class="pack-uuid">UUID: ${escapeHtml(pack.manifest?.header?.uuid || "Sem UUID")}</span>
                            <span class="pack-origin">${originLabel}</span>
                        </label>
                        <div class="pack-actions">
                            ${(!pack.manifest?.header?.uuid || !Array.isArray(pack.manifest?.header?.version)) && (!pack.fromWorld || typeKey !== "unknown") ? `
                            <button type="button" class="btn-inline btn-toggle-edit" data-editor-id="editor_${packDomId}" title="Editar UUID/Vers\xE3o">\u270F\uFE0F UUID/Vers\xE3o</button>` : ""}
                            <button type="button" class="btn-inline btn-download-pack" data-pack-id="${pack._id}" title="Baixar este addon como .mcpack individual">\u{1F4E5} .mcpack</button>
                        </div>
                    </div>
                    ${valDetailsHTML}
                    <div class="essentials-editor" id="editor_${packDomId}" style="display:none">
                        <div class="editor-row">
                            <label>UUID</label>
                            <input type="text" id="uuid_${packDomId}" value="${escapeHtml(pack.manifest?.header?.uuid || "")}" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                        </div>
                        <div class="editor-row">
                            <label>Vers\xE3o</label>
                            <input type="text" id="version_${packDomId}" value="${escapeHtml(Array.isArray(pack.manifest?.header?.version) ? pack.manifest.header.version.join(".") : "")}" placeholder="1.0.0" />
                        </div>
                        <button type="button" class="btn-success btn-inline btn-save-essentials" data-pack-dom-id="${packDomId}" data-pack-type="${typeKey}" data-internal-id="${pack._id}">Salvar</button>
                    </div>
            `;
        if (typeKey === "unknown" && !pack.fromWorld && pack.needsCategory) {
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
    html += renderPackGroup("behavior", "\u{1F4D8} Behavior Packs", state.processedAddons.behaviorPacks, "bp", "BP");
    html += renderPackGroup("resource", "\u{1F3A8} Resource Packs", state.processedAddons.resourcePacks, "rp", "RP");
    html += renderPackGroup("unknown", "\u2753 Packs Desconhecidos", state.processedAddons.unknownPacks, "unk", "?");
    if (html === "") {
      html = '<p class="no-packs">Nenhum addon processado.</p>';
    }
    elements.packsActivation.innerHTML = html;
  }

  // src/parsers/archive.js
  function isArchiveFile(fileName) {
    const archiveExtensions = [".zip", ".mcpack", ".mcaddon", ".tar", ".gz", ".tgz"];
    const lowerName = (fileName || "").toLowerCase();
    return archiveExtensions.some((ext) => lowerName.endsWith(ext)) || lowerName.endsWith(".tar.gz");
  }
  function cleanupCache() {
    const now = Date.now();
    if (now - state._cache.lastCleanup > CONFIG.CACHE_TTL) {
      state._cache.decompressedFiles.clear();
      state._cache.lastCleanup = now;
      console.log("\u{1F9F9} Cache limpo");
    }
  }
  async function processTarFile(uint8Array) {
    const zip = new JSZip();
    try {
      let offset = 0;
      const decoder = new TextDecoder("utf-8");
      let filesProcessed = 0;
      while (offset < uint8Array.length - 512) {
        const header = uint8Array.slice(offset, offset + 512);
        const isEmptyBlock = header.every((byte) => byte === 0);
        if (isEmptyBlock) {
          const nextHeader = uint8Array.slice(offset + 512, offset + 1024);
          if (nextHeader.every((byte) => byte === 0)) break;
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
        const sizeStr = decoder.decode(sizeBytes).trim().replace(/\0/g, "").replace(/\s/g, "");
        let fileSize = parseInt(sizeStr, 8) || 0;
        if (fileType === "L") {
          offset += 512;
          if (fileSize > 0 && offset + fileSize <= uint8Array.length) {
            const longNameBytes = uint8Array.slice(offset, offset + fileSize);
            fileName = decoder.decode(longNameBytes).replace(/\0/g, "").trim();
          }
          const padding = (512 - fileSize % 512) % 512;
          offset += fileSize + padding;
          continue;
        }
        const prefix = decoder.decode(header.slice(345, 500)).split("\0")[0].trim();
        if (prefix) fileName = prefix + "/" + fileName;
        offset += 512;
        if (fileType === "5" || fileName.endsWith("/")) {
          zip.folder(fileName.replace(/\/$/, ""));
          filesProcessed++;
        } else if (fileType === "0" || fileType === "\0" || fileType === "") {
          if (fileSize > 0 && offset + fileSize <= uint8Array.length) {
            const content = uint8Array.slice(offset, offset + fileSize);
            zip.file(fileName, content);
            filesProcessed++;
          }
        }
        if (fileSize > 0) {
          const padding = (512 - fileSize % 512) % 512;
          offset += fileSize + padding;
        }
      }
      return zip;
    } catch (error) {
      console.error("\u274C Erro ao processar TAR:", error);
      throw error;
    }
  }
  async function decompressFile(file) {
    const fileName = file.name.toLowerCase();
    try {
      if (fileName.endsWith(".rar") || fileName.endsWith(".7z")) {
        throw new Error(`Arquivos ${fileName.endsWith(".rar") ? ".rar" : ".7z"} n\xE3o s\xE3o suportados diretamente. Converta para .zip.`);
      }
      if (fileName.endsWith(".gz") || fileName.endsWith(".tgz")) {
        const arrayBuffer = await file.arrayBuffer();
        const decompressed = pako.ungzip(new Uint8Array(arrayBuffer));
        if (fileName.endsWith(".tar.gz") || fileName.endsWith(".tgz")) {
          return await processTarFile(decompressed);
        } else {
          return await JSZip.loadAsync(new Blob([decompressed]));
        }
      }
      if (fileName.endsWith(".tar")) {
        const arrayBuffer = await file.arrayBuffer();
        return await processTarFile(new Uint8Array(arrayBuffer));
      }
      return await JSZip.loadAsync(file);
    } catch (error) {
      console.error(`Erro ao descompactar ${file.name}:`, error);
      throw error;
    }
  }

  // src/parsers/manifest.js
  function removeJsonComments(jsonString) {
    if (!jsonString) return "";
    jsonString = jsonString.replace(/^[\uFEFF\uFFFE]+/, "");
    let result = "";
    let inString = false;
    let stringChar = "";
    let isEscaped = false;
    let i = 0;
    const len = jsonString.length;
    while (i < len) {
      const char = jsonString[i];
      const nextChar = i + 1 < len ? jsonString[i + 1] : "";
      if (inString) {
        if (isEscaped) {
          isEscaped = false;
          result += char;
        } else if (char === "\\") {
          isEscaped = true;
          result += char;
        } else if (char === stringChar) {
          inString = false;
          result += char;
        } else {
          const code = char.charCodeAt(0);
          if (code < 32 && char !== "\n" && char !== "\r" && char !== "	") {
            result += " ";
          } else {
            result += char;
          }
        }
        i++;
        continue;
      }
      if (char === '"' || char === "'") {
        inString = true;
        stringChar = char;
        result += char;
        i++;
      } else if (char === "/" && nextChar === "/") {
        i += 2;
        while (i < len && jsonString[i] !== "\n" && jsonString[i] !== "\r") {
          i++;
        }
      } else if (char === "/" && nextChar === "*") {
        i += 2;
        while (i + 1 < len && !(jsonString[i] === "*" && jsonString[i + 1] === "/")) {
          i++;
        }
        i += 2;
      } else {
        const code = char.charCodeAt(0);
        if (code < 32 && char !== "\n" && char !== "\r" && char !== "	") {
          result += " ";
        } else {
          result += char;
        }
        i++;
      }
    }
    result = result.replace(/,\s*([\]}])/g, "$1");
    return result;
  }
  function extractManifestEssentials(rawText) {
    try {
      const result = { uuid: null, version: null, modules: [] };
      if (!rawText) return result;
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
      const modulesBlockMatch = rawText.match(/"modules"\s*:\s*\[([\s\S]*?)\]/i);
      if (modulesBlockMatch) {
        const modMatches = [...modulesBlockMatch[1].matchAll(/\{([\s\S]*?)\}/g)];
        for (const modMatch of modMatches) {
          const modContent = modMatch[1];
          const typeMatch = modContent.match(/"type"\s*:\s*"([^"]+)"/i);
          const modUuidMatch = modContent.match(/"uuid"\s*:\s*"([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})"/i);
          if (typeMatch) {
            result.modules.push({
              type: typeMatch[1],
              uuid: modUuidMatch ? modUuidMatch[1] : generateRandomUUID(),
              version: result.version || [1, 0, 0]
            });
          }
        }
      }
      return result;
    } catch (e) {
      return { uuid: null, version: null, modules: [] };
    }
  }
  function detectPackType(manifest) {
    if (!manifest || !Array.isArray(manifest.modules)) return null;
    for (const module of manifest.modules) {
      const type = (module.type || "").toLowerCase();
      if (type === "data" || type === "script" || type === "javascript" || type === "client_data") {
        return "behavior";
      }
      if (type === "resources" || type === "skin_pack") {
        return "resource";
      }
    }
    return null;
  }
  function generateRandomUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : r & 3 | 8).toString(16);
    });
  }
  function parseManifestSafe(rawContent, fallbackName = "Addon Desconhecido", isFromWorld = false) {
    if (!rawContent) {
      return {
        manifest: {
          format_version: 2,
          header: { name: fallbackName, uuid: generateRandomUUID(), version: [1, 0, 0] },
          modules: [{ type: "data", uuid: generateRandomUUID(), version: [1, 0, 0] }]
        },
        isCorrupted: true
      };
    }
    const cleanRaw = typeof rawContent === "string" ? rawContent.replace(/^[\uFEFF\uFFFE]+/, "") : "";
    let cleaned = removeJsonComments(cleanRaw);
    let manifest = null;
    let isCorrupted = false;
    try {
      manifest = JSON.parse(cleaned);
    } catch (err1) {
      try {
        const aggressive = cleaned.replace(/^[\uFEFF\uFFFE]+/, "").replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        manifest = JSON.parse(aggressive);
      } catch (err2) {
        isCorrupted = true;
        const essentials = extractManifestEssentials(cleanRaw);
        manifest = {
          format_version: 2,
          header: {
            name: fallbackName + " \u26A0\uFE0F",
            description: isFromWorld ? "Manifest corrompido - Pack do mundo" : "Manifest inv\xE1lido \u2014 placeholder gerado",
            uuid: essentials.uuid || generateRandomUUID(),
            version: essentials.version || [1, 0, 0],
            min_engine_version: [1, 20, 0]
          },
          modules: essentials.modules && essentials.modules.length > 0 ? essentials.modules : [{ type: "data", uuid: generateRandomUUID(), version: [1, 0, 0] }]
        };
      }
    }
    return { manifest, isCorrupted };
  }

  // src/parsers/manifestValidator.js
  function validateBedrockManifest(manifest) {
    const errors = [];
    const warnings = [];
    if (!manifest || typeof manifest !== "object") {
      return { valid: false, errors: ["Manifest n\xE3o \xE9 um objeto JSON v\xE1lido."], warnings: [] };
    }
    if (!manifest.format_version) {
      warnings.push('Campo "format_version" ausente (recomendado: 2).');
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!manifest.header || typeof manifest.header !== "object") {
      errors.push('Bloco "header" ausente ou inv\xE1lido.');
    } else {
      const header = manifest.header;
      if (!header.name) {
        errors.push('Nome do pacote ("header.name") ausente.');
      }
      if (!header.uuid) {
        errors.push('UUID do pacote ("header.uuid") ausente.');
      } else if (!uuidRegex.test(header.uuid)) {
        errors.push("UUID do cabe\xE7alho inv\xE1lido. Deve ser no formato 8-4-4-4-12.");
      }
      if (!header.version) {
        errors.push('Vers\xE3o ("header.version") ausente.');
      } else if (!Array.isArray(header.version) || header.version.length !== 3 || header.version.some((n) => typeof n !== "number" || isNaN(n) || n < 0)) {
        errors.push("Vers\xE3o inv\xE1lida. Deve ser um array de 3 n\xFAmeros inteiros [major, minor, patch].");
      }
      if (!header.min_engine_version) {
        warnings.push('"min_engine_version" ausente no header (recomendado para Bedrock 1.14+).');
      } else if (!Array.isArray(header.min_engine_version) || header.min_engine_version.length !== 3) {
        warnings.push('"min_engine_version" deve ser um array de 3 n\xFAmeros [ex: 1, 20, 0].');
      }
    }
    if (!manifest.modules) {
      errors.push('Bloco "modules" ausente.');
    } else if (!Array.isArray(manifest.modules) || manifest.modules.length === 0) {
      errors.push('"modules" deve ser uma lista com pelo menos 1 m\xF3dulo definido.');
    } else {
      manifest.modules.forEach((mod, idx) => {
        if (!mod.type) {
          errors.push(`M\xF3dulo ${idx + 1} sem campo "type".`);
        }
        if (!mod.uuid) {
          warnings.push(`M\xF3dulo ${idx + 1} sem "uuid" pr\xF3prio.`);
        } else if (!uuidRegex.test(mod.uuid)) {
          warnings.push(`UUID do m\xF3dulo ${idx + 1} \xE9 inv\xE1lido.`);
        } else if (manifest.header?.uuid && mod.uuid.toLowerCase() === manifest.header.uuid.toLowerCase()) {
          errors.push(`UUID do m\xF3dulo ${idx + 1} \xE9 id\xEAntico ao UUID do header (deve ser \xFAnico!).`);
        }
      });
    }
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // src/services/packService.js
  async function extractPackFromZip(zip, manifestPath, options = {}) {
    const {
      suggestedPackType = null,
      isFromWorld = false,
      fromNestedZip = false,
      originalPath = "",
      fileName = ""
    } = options;
    const manifestEntry = zip.file(manifestPath);
    if (!manifestEntry) return null;
    const rawContent = await manifestEntry.async("string");
    const folderParts = manifestPath.split("/").filter(Boolean);
    const folderName = folderParts.length > 1 ? folderParts[folderParts.length - 2] : fileName.replace(/\.[^.]+$/, "") || "Addon";
    const { manifest, isCorrupted } = parseManifestSafe(rawContent, folderName, isFromWorld);
    const addonName = manifest.header?.name || folderName || "Unknown";
    let packType = detectPackType(manifest) || suggestedPackType;
    if (!packType || packType !== "behavior" && packType !== "resource") {
      packType = "unknown";
    }
    const addonRootPath = manifestPath.substring(0, manifestPath.lastIndexOf("/") + 1);
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
            zipEntry.async("blob").then((blob) => {
              addonFiles[relativePathInAddon] = blob;
            })
          );
        }
      }
    });
    await Promise.all(promises);
    const pathLooksWorld = /(^|\/)behavior_packs\//.test(manifestPath) || /(^|\/)resource_packs\//.test(manifestPath);
    const isWorldPack = isFromWorld || state.worldMode && pathLooksWorld;
    const validation = validateBedrockManifest(manifest);
    const addonData = {
      _id: generatePackId(),
      name: addonName,
      files: addonFiles,
      manifest,
      validation,
      originalPath: originalPath || addonRootPath,
      needsCategory: packType === "unknown" && !isWorldPack,
      fromWorld: isWorldPack,
      fromNestedZip,
      hasCorruptedManifest: isCorrupted || Boolean(manifest.header?.description?.includes("Manifest corrompido"))
    };
    if (packType === "behavior") {
      state.processedAddons.behaviorPacks.push(addonData);
      state.activationState.behaviorPacks[addonData._id] = true;
    } else if (packType === "resource") {
      state.processedAddons.resourcePacks.push(addonData);
      state.activationState.resourcePacks[addonData._id] = true;
    } else {
      state.processedAddons.unknownPacks.push(addonData);
      state.activationState.unknownPacks[addonData._id] = true;
    }
    return addonData;
  }
  async function processAddonFile(file) {
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
          } else if (zipEntry.name.toLowerCase().endsWith("manifest.json")) {
            manifestFiles.push({ path: relativePath, entry: zipEntry });
          }
        }
      });
      if (nestedArchives.length > 0) {
        for (const nested of nestedArchives) {
          try {
            const nestedBlob = await nested.entry.async("blob");
            const nestedFileName = nested.path.split("/").pop();
            const nestedFile = new File([nestedBlob], nestedFileName, { type: "application/zip" });
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
      showToast(`Erro ao processar ${file.name}: ${err.message}`, "error");
    }
  }
  function togglePackActivation(packId, packType, checked) {
    if (packType === "behavior") {
      state.activationState.behaviorPacks[packId] = checked;
    } else if (packType === "resource") {
      state.activationState.resourcePacks[packId] = checked;
    } else if (packType === "unknown") {
      state.activationState.unknownPacks[packId] = checked;
    }
  }
  function saveEditEssentials(packId, packType, packInternalId, uuid, versionStr) {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(uuid)) {
      showToast("UUID inv\xE1lido. Use o formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "error");
      return false;
    }
    const verParts = (versionStr || "").split(".").map((n) => parseInt(n, 10)).filter((n) => !isNaN(n));
    if (verParts.length !== 3) {
      showToast("Vers\xE3o inv\xE1lida. Use o formato major.minor.patch (ex: 1.0.0)", "error");
      return false;
    }
    const list = packType === "behavior" ? state.processedAddons.behaviorPacks : packType === "resource" ? state.processedAddons.resourcePacks : state.processedAddons.unknownPacks;
    const pack = list.find((p) => p._id === packInternalId);
    if (!pack) {
      showToast("Pack n\xE3o encontrado.", "error");
      return false;
    }
    pack.manifest = pack.manifest || { header: {} };
    pack.manifest.header = pack.manifest.header || {};
    pack.manifest.header.uuid = uuid;
    pack.manifest.header.version = verParts;
    pack.validation = validateBedrockManifest(pack.manifest);
    if (pack.validation.valid) {
      pack.hasCorruptedManifest = false;
    }
    showToast("Manifest atualizado com sucesso!", "success");
    return true;
  }
  function dedupeActivation() {
    const all = [
      ...state.processedAddons.behaviorPacks.map((p) => ({ ...p, _t: "behavior" })),
      ...state.processedAddons.resourcePacks.map((p) => ({ ...p, _t: "resource" })),
      ...state.processedAddons.unknownPacks.map((p) => ({ ...p, _t: "unknown" }))
    ];
    const groups = {};
    all.forEach((p) => {
      const key = p?.manifest?.header?.uuid || `no-uuid:${p.name}`;
      groups[key] = groups[key] || [];
      groups[key].push(p);
    });
    let changed = 0;
    let groupsCount = 0;
    Object.values(groups).forEach((items) => {
      if (items.length > 1) {
        groupsCount++;
        items.forEach((p, idx) => {
          const target = p._t === "behavior" ? state.activationState.behaviorPacks : p._t === "resource" ? state.activationState.resourcePacks : state.activationState.unknownPacks;
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
  function resolveDuplicateChoiceByIndex(groupKey, indexInGroup) {
    const all = [
      ...state.processedAddons.behaviorPacks.map((p) => ({ ...p, _t: "behavior" })),
      ...state.processedAddons.resourcePacks.map((p) => ({ ...p, _t: "resource" })),
      ...state.processedAddons.unknownPacks.map((p) => ({ ...p, _t: "unknown" }))
    ];
    const matches = all.filter((p) => (p?.manifest?.header?.uuid || `no-uuid:${p.name}`) === groupKey);
    if (matches.length === 0) return;
    const idx = parseInt(indexInGroup, 10);
    if (isNaN(idx) || idx < 0 || idx >= matches.length) return;
    state.duplicateSelection[groupKey] = idx;
    matches.forEach((p, i) => {
      const target = p._t === "behavior" ? state.activationState.behaviorPacks : p._t === "resource" ? state.activationState.resourcePacks : state.activationState.unknownPacks;
      target[p._id] = i === idx;
    });
  }
  function resolveDuplicateNone(groupKey) {
    const all = [
      ...state.processedAddons.behaviorPacks.map((p) => ({ ...p, _t: "behavior" })),
      ...state.processedAddons.resourcePacks.map((p) => ({ ...p, _t: "resource" })),
      ...state.processedAddons.unknownPacks.map((p) => ({ ...p, _t: "unknown" }))
    ];
    const matches = all.filter((p) => (p?.manifest?.header?.uuid || `no-uuid:${p.name}`) === groupKey);
    state.duplicateSelection[groupKey] = -1;
    matches.forEach((p) => {
      const target = p._t === "behavior" ? state.activationState.behaviorPacks : p._t === "resource" ? state.activationState.resourcePacks : state.activationState.unknownPacks;
      target[p._id] = false;
    });
  }
  function resolveDuplicateBoth(groupKey) {
    const all = [
      ...state.processedAddons.behaviorPacks.map((p) => ({ ...p, _t: "behavior" })),
      ...state.processedAddons.resourcePacks.map((p) => ({ ...p, _t: "resource" })),
      ...state.processedAddons.unknownPacks.map((p) => ({ ...p, _t: "unknown" }))
    ];
    const matches = all.filter((p) => (p?.manifest?.header?.uuid || `no-uuid:${p.name}`) === groupKey);
    state.duplicateSelection[groupKey] = -2;
    matches.forEach((p) => {
      const target = p._t === "behavior" ? state.activationState.behaviorPacks : p._t === "resource" ? state.activationState.resourcePacks : state.activationState.unknownPacks;
      target[p._id] = true;
    });
  }
  function categorizeUnknownPack(packIndex, newCategory) {
    if (!newCategory || packIndex === void 0) return;
    const pack = state.processedAddons.unknownPacks[packIndex];
    if (!pack) return;
    delete pack.needsCategory;
    if (newCategory === "behavior") {
      state.processedAddons.behaviorPacks.push(pack);
      state.activationState.behaviorPacks[pack._id] = true;
    } else if (newCategory === "resource") {
      state.processedAddons.resourcePacks.push(pack);
      state.activationState.resourcePacks[pack._id] = true;
    }
    state.processedAddons.unknownPacks.splice(packIndex, 1);
    delete state.activationState.unknownPacks[pack._id];
  }
  function selectAllPacks() {
    Object.keys(state.activationState.behaviorPacks).forEach((id) => {
      state.activationState.behaviorPacks[id] = true;
    });
    Object.keys(state.activationState.resourcePacks).forEach((id) => {
      state.activationState.resourcePacks[id] = true;
    });
    Object.keys(state.activationState.unknownPacks).forEach((id) => {
      state.activationState.unknownPacks[id] = true;
    });
  }
  function deselectAllPacks() {
    Object.keys(state.activationState.behaviorPacks).forEach((id) => {
      state.activationState.behaviorPacks[id] = false;
    });
    Object.keys(state.activationState.resourcePacks).forEach((id) => {
      state.activationState.resourcePacks[id] = false;
    });
    Object.keys(state.activationState.unknownPacks).forEach((id) => {
      state.activationState.unknownPacks[id] = false;
    });
  }
  function generateBehaviorPacksActivation() {
    const activePacks = [];
    state.processedAddons.behaviorPacks.forEach((pack) => {
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
  function generateResourcePacksActivation() {
    const activePacks = [];
    state.processedAddons.resourcePacks.forEach((pack) => {
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
  function formatPacksJson(packs) {
    if (!packs || packs.length === 0) return "[\n	\n]";
    return JSON.stringify(packs, null, "	");
  }

  // src/services/worldService.js
  async function checkIfIsWorld(file) {
    try {
      const zip = await decompressFile(file);
      let hasWorldIndicators = false;
      zip.forEach((relativePath) => {
        const path = relativePath.toLowerCase();
        if (path.endsWith("level.dat") || path.includes("world_behavior_packs.json") || path.includes("world_resource_packs.json") || path.includes("db/current") || path.includes("db/manifest")) {
          hasWorldIndicators = true;
        }
      });
      return hasWorldIndicators;
    } catch (error) {
      console.warn("Erro ao verificar se \xE9 mundo:", error);
      return false;
    }
  }
  async function processWorld(worldFile) {
    const zip = await decompressFile(worldFile);
    state.worldData = {
      name: worldFile.name.replace(/\.(mcworld|zip|tar\.gz|tgz|tar|7z)$/i, ""),
      existingBehaviorPacks: [],
      existingResourcePacks: [],
      activationFiles: { behavior: null, resource: null }
    };
    let worldRootPath = "";
    const allPaths = [];
    zip.forEach((relativePath) => allPaths.push(relativePath));
    for (const path of allPaths) {
      if (path.includes("behavior_packs/") || path.includes("resource_packs/") || path.endsWith("level.dat") || path.endsWith("world_behavior_packs.json") || path.endsWith("world_resource_packs.json")) {
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
        if (normalizedPath === "world_behavior_packs.json" || relativePath.endsWith("/world_behavior_packs.json")) {
          promises.push(
            zipEntry.async("string").then((c) => {
              state.worldData.activationFiles.behavior = JSON.parse(c);
            }).catch(() => {
            })
          );
        } else if (normalizedPath === "world_resource_packs.json" || relativePath.endsWith("/world_resource_packs.json")) {
          promises.push(
            zipEntry.async("string").then((c) => {
              state.worldData.activationFiles.resource = JSON.parse(c);
            }).catch(() => {
            })
          );
        } else if (normalizedPath.includes("behavior_packs/") && normalizedPath.endsWith("manifest.json")) {
          const packFolder = normalizedPath.substring(0, normalizedPath.lastIndexOf("/") + 1);
          promises.push(
            extractPackFromZip(zip, relativePath, { suggestedPackType: "behavior", isFromWorld: true, originalPath: packFolder })
          );
        } else if (normalizedPath.includes("resource_packs/") && normalizedPath.endsWith("manifest.json")) {
          const packFolder = normalizedPath.substring(0, normalizedPath.lastIndexOf("/") + 1);
          promises.push(
            extractPackFromZip(zip, relativePath, { suggestedPackType: "resource", isFromWorld: true, originalPath: packFolder })
          );
        } else if ((normalizedPath.includes("behavior_packs/") || normalizedPath.includes("resource_packs/")) && (normalizedPath.endsWith(".zip") || normalizedPath.endsWith(".mcpack"))) {
          const suggested = normalizedPath.includes("behavior_packs/") ? "behavior" : "resource";
          const packFolder = normalizedPath.substring(0, normalizedPath.lastIndexOf("/") + 1);
          promises.push(
            zipEntry.async("arraybuffer").then(async (ab) => {
              const nestedZip = await JSZip.loadAsync(ab);
              let mPath = null;
              nestedZip.forEach((rPath, e) => {
                if (!e.dir && rPath.endsWith("manifest.json")) {
                  if (!mPath || rPath.split("/").length < mPath.split("/").length) mPath = rPath;
                }
              });
              if (mPath) {
                await extractPackFromZip(nestedZip, mPath, { suggestedPackType: suggested, isFromWorld: true, fromNestedZip: true, originalPath: packFolder });
              }
            }).catch((e) => console.error("Erro em pack aninhado no mundo:", e))
          );
        }
      }
    });
    await Promise.all(promises);
  }

  // src/services/exportService.js
  async function downloadOrganizedAddons() {
    const startTime = Date.now();
    const downloadBtn = elements.downloadBtn;
    try {
      let getUniqueFolder = function(basePrefix, packName) {
        const cleanName = sanitizeFolderName(packName);
        let target = `${basePrefix}/${cleanName}/`.replace(/\/+/g, "/");
        if (!usedPaths.has(target)) {
          usedPaths.add(target);
          return target;
        }
        let counter = 2;
        while (usedPaths.has(`${basePrefix}/${cleanName}_${counter}/`.replace(/\/+/g, "/"))) {
          counter++;
        }
        const unique = `${basePrefix}/${cleanName}_${counter}/`.replace(/\/+/g, "/");
        usedPaths.add(unique);
        return unique;
      }, getCleanWorldPackPath = function(originalPath, defaultPrefix, packName) {
        if (originalPath) {
          let p = originalPath.replace(/\\/g, "/").replace(/^\/+/, "");
          const bpIdx = p.indexOf("behavior_packs/");
          const rpIdx = p.indexOf("resource_packs/");
          const unkIdx = p.indexOf("unknown_packs/");
          if (bpIdx >= 0) {
            p = p.substring(bpIdx);
          } else if (rpIdx >= 0) {
            p = p.substring(rpIdx);
          } else if (unkIdx >= 0) {
            p = p.substring(unkIdx);
          }
          if (!p.endsWith("/")) p += "/";
          if (!usedPaths.has(p)) {
            usedPaths.add(p);
            return p;
          }
        }
        return getUniqueFolder(defaultPrefix, packName);
      };
      downloadBtn.disabled = true;
      downloadBtn.classList.add("btn-loading");
      downloadBtn.innerHTML = "<span>\u23F3 Preparando...</span>";
      const finalZip = new JSZip();
      const usedPaths = /* @__PURE__ */ new Set();
      const totalPacks = state.processedAddons.behaviorPacks.length + state.processedAddons.resourcePacks.length + state.processedAddons.unknownPacks.length;
      let processedPacks = 0;
      for (const pack of state.processedAddons.behaviorPacks) {
        let targetPath;
        if (pack.fromWorld && pack.originalPath && !pack.fromNestedZip) {
          targetPath = getCleanWorldPackPath(pack.originalPath, "behavior_packs", pack.name);
        } else {
          targetPath = getUniqueFolder("behavior_packs", pack.name);
        }
        const folder = finalZip.folder(targetPath);
        for (const [filePath, blob2] of Object.entries(pack.files)) {
          folder.file(filePath, blob2);
        }
        processedPacks++;
        downloadBtn.innerHTML = `<span>\u23F3 ${Math.round(processedPacks / totalPacks * 100)}%</span>`;
      }
      for (const pack of state.processedAddons.resourcePacks) {
        let targetPath;
        if (pack.fromWorld && pack.originalPath && !pack.fromNestedZip) {
          targetPath = getCleanWorldPackPath(pack.originalPath, "resource_packs", pack.name);
        } else {
          targetPath = getUniqueFolder("resource_packs", pack.name);
        }
        const folder = finalZip.folder(targetPath);
        for (const [filePath, blob2] of Object.entries(pack.files)) {
          folder.file(filePath, blob2);
        }
        processedPacks++;
        downloadBtn.innerHTML = `<span>\u23F3 ${Math.round(processedPacks / totalPacks * 100)}%</span>`;
      }
      for (const pack of state.processedAddons.unknownPacks) {
        let targetPath;
        if (pack.fromWorld && pack.originalPath) {
          targetPath = getCleanWorldPackPath(pack.originalPath, "unknown_packs", pack.name);
        } else {
          targetPath = getUniqueFolder("unknown_packs", pack.name);
        }
        const folder = finalZip.folder(targetPath);
        for (const [filePath, blob2] of Object.entries(pack.files)) {
          folder.file(filePath, blob2);
        }
        processedPacks++;
      }
      const bpJson = formatPacksJson(generateBehaviorPacksActivation());
      finalZip.file("world_behavior_packs.json", bpJson);
      const rpJson = formatPacksJson(generateResourcePacksActivation());
      finalZip.file("world_resource_packs.json", rpJson);
      downloadBtn.innerHTML = "<span>\u23F3 Compactando...</span>";
      const blob = await finalZip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: CONFIG.COMPRESSION_LEVEL }
      }, (metadata) => {
        const percent = Math.round(metadata.percent);
        if (percent % 10 === 0) {
          downloadBtn.innerHTML = `<span>\u23F3 Compactando ${percent}%</span>`;
        }
      });
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const fileName = state.worldMode && state.worldData ? `${sanitizeFolderName(state.worldData.name)}_addons_${timestamp}.zip` : `minecraft_addons_${timestamp}.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      cleanupCache();
      const elapsed = ((Date.now() - startTime) / 1e3).toFixed(1);
      showToast(`\u2705 Download conclu\xEDdo em ${elapsed}s`, "success");
      hapticFeedback("success");
    } catch (error) {
      console.error("Erro ao gerar ZIP:", error);
      showToast(`\u274C Erro ao gerar: ${error.message}`, "error", 5e3);
      hapticFeedback("error");
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.classList.remove("btn-loading");
      downloadBtn.innerHTML = `<span id="downloadBtnText">\u{1F4E5} Baixar Addons Organizados</span>`;
    }
  }
  async function downloadSinglePack(packId) {
    const allPacks = [
      ...state.processedAddons.behaviorPacks,
      ...state.processedAddons.resourcePacks,
      ...state.processedAddons.unknownPacks
    ];
    const pack = allPacks.find((p) => p._id === packId);
    if (!pack) {
      showToast("\u274C Pack n\xE3o encontrado.", "error");
      return;
    }
    try {
      showToast(`\u23F3 Gerando .mcpack para "${pack.name}"...`, "info", 2e3);
      const zip = new JSZip();
      for (const [filePath, blob2] of Object.entries(pack.files)) {
        zip.file(filePath, blob2);
      }
      if (pack.manifest) {
        zip.file("manifest.json", JSON.stringify(pack.manifest, null, "	"));
      }
      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: CONFIG.COMPRESSION_LEVEL }
      });
      const safeName = sanitizeFolderName(pack.name) || "addon";
      const fileName = `${safeName}.mcpack`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`\u2705 "${fileName}" baixado com sucesso!`, "success");
      hapticFeedback("success");
    } catch (error) {
      console.error("Erro ao baixar mcpack:", error);
      showToast(`\u274C Erro ao baixar pack: ${error.message}`, "error");
      hapticFeedback("error");
    }
  }

  // src/ui/events.js
  function validateFile(file) {
    const errors = [];
    if (file.size > CONFIG.MAX_FILE_SIZE) {
      errors.push(`Arquivo muito grande`);
    }
    if (file.size === 0) {
      errors.push("Arquivo vazio");
    }
    const fileName = file.name.toLowerCase();
    const extension = fileName.substring(fileName.lastIndexOf("."));
    const isTarGz = fileName.endsWith(".tar.gz");
    const isValid = CONFIG.SUPPORTED_EXTENSIONS.includes(extension) || isTarGz;
    if (extension === ".rar" || extension === ".7z") {
      errors.push(`${extension} n\xE3o \xE9 suportado no navegador. Extraia e envie como .zip ou .mcpack`);
    } else if (!isValid) {
      errors.push(`Extens\xE3o n\xE3o suportada: ${extension}`);
    }
    return { valid: errors.length === 0, errors };
  }
  async function addFiles(files) {
    if (state.uploadedFiles.length + files.length > CONFIG.MAX_FILES) {
      showToast(`\u26A0\uFE0F M\xE1ximo de ${CONFIG.MAX_FILES} arquivos por vez`, "error");
      return;
    }
    let addedCount = 0;
    let errorCount = 0;
    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        console.warn(`\u274C ${file.name}: ${validation.errors.join(", ")}`);
        showToast(`\u274C ${file.name}: ${validation.errors[0]}`, "error");
        hapticFeedback("error");
        errorCount++;
        continue;
      }
      const fileName = file.name.toLowerCase();
      const extension = fileName.substring(fileName.lastIndexOf("."));
      const isTarGz = fileName.endsWith(".tar.gz");
      let isWorld = extension === ".mcworld";
      if (!isWorld && (extension === ".zip" || extension === ".tar" || isTarGz)) {
        try {
          isWorld = await checkIfIsWorld(file);
        } catch (err) {
          console.warn("Erro ao verificar mundo:", err);
        }
      }
      if (isWorld) {
        state.uploadedFiles = [file];
        state.worldMode = true;
        showToast("\u{1F30D} Mundo detectado!", "success");
        addedCount = 1;
        break;
      } else {
        const exists = state.uploadedFiles.some((f) => f.name === file.name && f.size === file.size);
        if (!exists) {
          state.uploadedFiles.push(file);
          addedCount++;
        }
      }
    }
    if (addedCount > 0) {
      const count = state.uploadedFiles.length;
      showToast(`\u2705 ${count} arquivo${count > 1 ? "s" : ""} pronto${count > 1 ? "s" : ""}`, "success", 2e3);
    } else if (errorCount > 0) {
      showToast(`\u274C ${errorCount} arquivo${errorCount > 1 ? "s" : ""} com erro`, "error");
    }
    renderFilesList();
    updateActionsVisibility();
  }
  function removeFile(index) {
    hapticFeedback("light");
    state.uploadedFiles.splice(index, 1);
    renderFilesList();
    updateActionsVisibility();
  }
  function clearFiles() {
    clearState();
    renderFilesList();
    updateActionsVisibility();
    elements.resultsSection.style.display = "none";
    elements.progressSection.style.display = "none";
  }
  async function processAddons() {
    if (state.uploadedFiles.length === 0) return;
    resetProcessedAddons();
    elements.progressSection.style.display = "block";
    elements.resultsSection.style.display = "none";
    elements.actions.style.display = "none";
    try {
      const totalFiles = state.uploadedFiles.length;
      if (state.worldMode && totalFiles === 1) {
        updateProgress(25, "Detectado mundo, analisando conte\xFAdo...");
        await processWorld(state.uploadedFiles[0]);
        updateProgress(100, "Mundo carregado!");
      } else {
        for (let i = 0; i < totalFiles; i++) {
          const file = state.uploadedFiles[i];
          const progress = (i + 1) / totalFiles * 100;
          updateProgress(progress, `Processando ${file.name}...`);
          await processAddonFile(file);
        }
        updateProgress(100, "Conclu\xEDdo!");
      }
      showResults();
    } catch (error) {
      console.error("Erro ao processar addons:", error);
      showToast(`\u274C Erro: ${error.message}`, "error", 5e3);
      hapticFeedback("error");
      elements.progressSection.style.display = "none";
      elements.actions.style.display = "flex";
    }
  }
  async function handleAdditionalAddons(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    try {
      elements.progressSection.style.display = "block";
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progress = (i + 1) / files.length * 100;
        updateProgress(progress, `Adicionando ${file.name}...`);
        await processAddonFile(file);
      }
      updateProgress(100, "Addons adicionados!");
      setTimeout(() => {
        elements.progressSection.style.display = "none";
        showResults();
      }, 1e3);
    } catch (error) {
      console.error("Erro ao adicionar addons:", error);
      showToast(`Erro ao adicionar addons: ${error.message}`, "error");
      elements.progressSection.style.display = "none";
    }
    e.target.value = "";
  }
  function setupEventListeners() {
    const dropZone = elements.dropZone;
    const fileInput = elements.fileInput;
    let dragCounter = 0;
    dropZone.addEventListener("click", (e) => {
      const clicked = e.target;
      const isInteractive = clicked.tagName === "LABEL" || clicked.tagName === "SUMMARY" || clicked.tagName === "DETAILS" || clicked.tagName === "A" || clicked.closest("details") || clicked.closest("summary");
      if (!isInteractive) {
        hapticFeedback("light");
        fileInput.click();
      }
    });
    dropZone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        hapticFeedback("light");
        fileInput.click();
      }
    });
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    });
    dropZone.addEventListener("dragenter", (e) => {
      e.preventDefault();
      dragCounter++;
      dropZone.classList.add("drag-over");
    });
    dropZone.addEventListener("dragleave", (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        dropZone.classList.remove("drag-over");
      }
    });
    dropZone.addEventListener("drop", async (e) => {
      e.preventDefault();
      dragCounter = 0;
      dropZone.classList.remove("drag-over");
      hapticFeedback("medium");
      await addFiles(Array.from(e.dataTransfer.files));
    });
    fileInput.addEventListener("change", (e) => {
      addFiles(Array.from(e.target.files));
      e.target.value = "";
    });
    elements.processBtn.addEventListener("click", () => {
      hapticFeedback("medium");
      processAddons();
    });
    elements.clearBtn.addEventListener("click", () => {
      hapticFeedback("light");
      clearFiles();
    });
    elements.downloadBtn.addEventListener("click", () => {
      hapticFeedback("success");
      downloadOrganizedAddons();
    });
    elements.selectAllBtn.addEventListener("click", () => {
      hapticFeedback("light");
      selectAllPacks();
      renderActivationOptions();
    });
    elements.deselectAllBtn.addEventListener("click", () => {
      hapticFeedback("light");
      deselectAllPacks();
      renderActivationOptions();
    });
    elements.additionalAddons.addEventListener("change", handleAdditionalAddons);
    elements.filesList.addEventListener("click", (e) => {
      const btn = e.target.closest(".file-remove");
      if (btn && btn.dataset.index !== void 0) {
        removeFile(parseInt(btn.dataset.index, 10));
      }
    });
    elements.packsActivation.addEventListener("click", (e) => {
      const toggleBtn = e.target.closest(".btn-toggle-edit");
      if (toggleBtn) {
        const editor = document.getElementById(toggleBtn.dataset.editorId);
        if (editor) {
          editor.style.display = editor.style.display === "none" ? "block" : "none";
        }
        return;
      }
      const downloadPackBtn = e.target.closest(".btn-download-pack");
      if (downloadPackBtn && downloadPackBtn.dataset.packId) {
        downloadSinglePack(downloadPackBtn.dataset.packId);
        return;
      }
      const saveBtn = e.target.closest(".btn-save-essentials");
      if (saveBtn) {
        const { packDomId, packType, internalId } = saveBtn.dataset;
        const uuid = document.getElementById(`uuid_${packDomId}`)?.value?.trim();
        const version = document.getElementById(`version_${packDomId}`)?.value?.trim();
        if (saveEditEssentials(packDomId, packType, internalId, uuid, version)) {
          renderActivationOptions();
        }
        return;
      }
      const dedupeBtn = e.target.closest("#btnDedupeAction");
      if (dedupeBtn) {
        dedupeActivation();
        renderActivationOptions();
        return;
      }
      const radioChoice = e.target.closest(".dupe-radio-choice");
      if (radioChoice) {
        resolveDuplicateChoiceByIndex(radioChoice.dataset.groupKey, radioChoice.dataset.index);
        renderActivationOptions();
        return;
      }
      const radioNone = e.target.closest(".dupe-radio-none");
      if (radioNone) {
        resolveDuplicateNone(radioNone.dataset.groupKey);
        renderActivationOptions();
        return;
      }
      const radioBoth = e.target.closest(".dupe-radio-both");
      if (radioBoth) {
        resolveDuplicateBoth(radioBoth.dataset.groupKey);
        renderActivationOptions();
        return;
      }
    });
    elements.packsActivation.addEventListener("change", (e) => {
      const check = e.target.closest(".pack-activation-check");
      if (check) {
        togglePackActivation(check.dataset.packId, check.dataset.packType, check.checked);
        return;
      }
      const select = e.target.closest(".select-category");
      if (select) {
        categorizeUnknownPack(parseInt(select.dataset.packIndex, 10), select.value);
        renderActivationOptions();
        return;
      }
    });
  }

  // src/main.js
  document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
    updateActionsVisibility();
    console.log("\u{1F680} Bedrock Addon Installer inicializado com sucesso.");
    if ("serviceWorker" in navigator && (window.location.protocol === "http:" || window.location.protocol === "https:")) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").then((reg) => {
          console.log("\u{1F4E1} PWA Service Worker registrado:", reg.scope);
        }).catch((err) => {
          console.warn("\u26A0\uFE0F Falha ao registrar Service Worker:", err);
        });
      });
    }
  });
})();
