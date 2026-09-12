export function validateBedrockManifest(manifest) {
    const errors = [];
    const warnings = [];

    if (!manifest || typeof manifest !== 'object') {
        return { valid: false, errors: ['Manifest não é um objeto JSON válido.'], warnings: [] };
    }

    if (!manifest.format_version) {
        warnings.push('Campo "format_version" ausente (recomendado: 2).');
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!manifest.header || typeof manifest.header !== 'object') {
        errors.push('Bloco "header" ausente ou inválido.');
    } else {
        const header = manifest.header;
        if (!header.name) {
            errors.push('Nome do pacote ("header.name") ausente.');
        }
        if (!header.uuid) {
            errors.push('UUID do pacote ("header.uuid") ausente.');
        } else if (!uuidRegex.test(header.uuid)) {
            errors.push('UUID do cabeçalho inválido. Deve ser no formato 8-4-4-4-12.');
        }

        if (!header.version) {
            errors.push('Versão ("header.version") ausente.');
        } else if (!Array.isArray(header.version) || header.version.length !== 3 || header.version.some(n => typeof n !== 'number' || isNaN(n) || n < 0)) {
            errors.push('Versão inválida. Deve ser um array de 3 números inteiros [major, minor, patch].');
        }

        if (!header.min_engine_version) {
            warnings.push('"min_engine_version" ausente no header (recomendado para Bedrock 1.14+).');
        } else if (!Array.isArray(header.min_engine_version) || header.min_engine_version.length !== 3) {
            warnings.push('"min_engine_version" deve ser um array de 3 números [ex: 1, 20, 0].');
        }
    }

    if (!manifest.modules) {
        errors.push('Bloco "modules" ausente.');
    } else if (!Array.isArray(manifest.modules) || manifest.modules.length === 0) {
        errors.push('"modules" deve ser uma lista com pelo menos 1 módulo definido.');
    } else {
        manifest.modules.forEach((mod, idx) => {
            if (!mod.type) {
                errors.push(`Módulo ${idx + 1} sem campo "type".`);
            }
            if (!mod.uuid) {
                warnings.push(`Módulo ${idx + 1} sem "uuid" próprio.`);
            } else if (!uuidRegex.test(mod.uuid)) {
                warnings.push(`UUID do módulo ${idx + 1} é inválido.`);
            } else if (manifest.header?.uuid && mod.uuid.toLowerCase() === manifest.header.uuid.toLowerCase()) {
                errors.push(`UUID do módulo ${idx + 1} é idêntico ao UUID do header (deve ser único!).`);
            }
        });
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}
