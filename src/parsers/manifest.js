export function removeJsonComments(jsonString) {
    if (!jsonString) return '';
    // Remove UTF-8 Byte Order Mark (BOM) se presente (comum em arquivos criados no Windows)
    jsonString = jsonString.replace(/^[\uFEFF\uFFFE]+/, '');

    let result = '';
    let inString = false;
    let stringChar = '';
    let isEscaped = false;
    let i = 0;
    const len = jsonString.length;

    while (i < len) {
        const char = jsonString[i];
        const nextChar = i + 1 < len ? jsonString[i + 1] : '';

        if (inString) {
            if (isEscaped) {
                isEscaped = false;
                result += char;
            } else if (char === '\\') {
                isEscaped = true;
                result += char;
            } else if (char === stringChar) {
                inString = false;
                result += char;
            } else {
                const code = char.charCodeAt(0);
                if (code < 32 && char !== '\n' && char !== '\r' && char !== '\t') {
                    result += ' ';
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
        } else if (char === '/' && nextChar === '/') {
            i += 2;
            while (i < len && jsonString[i] !== '\n' && jsonString[i] !== '\r') {
                i++;
            }
        } else if (char === '/' && nextChar === '*') {
            i += 2;
            while (i + 1 < len && !(jsonString[i] === '*' && jsonString[i + 1] === '/')) {
                i++;
            }
            i += 2;
        } else {
            const code = char.charCodeAt(0);
            if (code < 32 && char !== '\n' && char !== '\r' && char !== '\t') {
                result += ' ';
            } else {
                result += char;
            }
            i++;
        }
    }

    result = result.replace(/,\s*([\]}])/g, '$1');
    return result;
}

export function extractManifestEssentials(rawText) {
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

        // Tenta extrair módulos do rawText
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

export function detectPackType(manifest) {
    if (!manifest || !Array.isArray(manifest.modules)) return null;
    for (const module of manifest.modules) {
        const type = (module.type || '').toLowerCase();
        if (type === 'data' || type === 'script' || type === 'javascript' || type === 'client_data') {
            return 'behavior';
        }
        if (type === 'resources' || type === 'skin_pack') {
            return 'resource';
        }
    }
    return null;
}

export function generateRandomUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

export function parseManifestSafe(rawContent, fallbackName = 'Addon Desconhecido', isFromWorld = false) {
    if (!rawContent) {
        return {
            manifest: {
                format_version: 2,
                header: { name: fallbackName, uuid: generateRandomUUID(), version: [1, 0, 0] },
                modules: [{ type: 'data', uuid: generateRandomUUID(), version: [1, 0, 0] }]
            },
            isCorrupted: true
        };
    }

    const cleanRaw = typeof rawContent === 'string' ? rawContent.replace(/^[\uFEFF\uFFFE]+/, '') : '';
    let cleaned = removeJsonComments(cleanRaw);
    let manifest = null;
    let isCorrupted = false;

    try {
        manifest = JSON.parse(cleaned);
    } catch (err1) {
        try {
            const aggressive = cleaned
                .replace(/^[\uFEFF\uFFFE]+/, '')
                .replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, '')
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n');
            manifest = JSON.parse(aggressive);
        } catch (err2) {
            isCorrupted = true;
            const essentials = extractManifestEssentials(cleanRaw);
            manifest = {
                format_version: 2,
                header: {
                    name: fallbackName + ' ⚠️',
                    description: isFromWorld ? 'Manifest corrompido - Pack do mundo' : 'Manifest inválido — placeholder gerado',
                    uuid: essentials.uuid || generateRandomUUID(),
                    version: essentials.version || [1, 0, 0],
                    min_engine_version: [1, 20, 0]
                },
                modules: (essentials.modules && essentials.modules.length > 0)
                    ? essentials.modules
                    : [{ type: 'data', uuid: generateRandomUUID(), version: [1, 0, 0] }]
            };
        }
    }

    return { manifest, isCorrupted };
}

