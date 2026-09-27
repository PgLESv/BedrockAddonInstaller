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
        errors.push('Bloco "header" ausente ou inválido no manifest (o arquivo de registro do mod não possui cabeçalho).');
    } else {
        const header = manifest.header;
        if (!header.name) {
            errors.push('Nome do pacote ("header.name") ausente (o mod está sem nome no manifest).');
        }
        if (!header.uuid) {
            errors.push('UUID do pacote ("header.uuid") ausente (o código de identidade do mod não foi encontrado).');
        } else if (!uuidRegex.test(header.uuid)) {
            errors.push('UUID do cabeçalho inválido. O código de identificação do mod deve estar no formato 8-4-4-4-12 (ex: 12345678-1234-1234-1234-123456789abc).');
        }

        if (!header.version) {
            errors.push('Versão ("header.version") ausente no manifest.');
        } else if (!Array.isArray(header.version) || header.version.length !== 3 || header.version.some(n => typeof n !== 'number' || isNaN(n) || n < 0)) {
            errors.push('Versão inválida. O Minecraft exige que a versão seja uma lista com 3 números inteiros [ex: 1, 0, 0].');
        }

        if (!header.min_engine_version) {
            warnings.push('"min_engine_version" ausente no header (indica para qual versão do Minecraft o mod foi feito).');
        } else if (!Array.isArray(header.min_engine_version) || header.min_engine_version.length !== 3) {
            warnings.push('"min_engine_version" deve ser uma lista com 3 números [ex: 1, 20, 0].');
        }
    }

    if (!manifest.modules) {
        errors.push('Bloco "modules" ausente (o mod precisa declarar pelo menos um módulo de código ou textura).');
    } else if (!Array.isArray(manifest.modules) || manifest.modules.length === 0) {
        errors.push('"modules" deve ser uma lista com pelo menos 1 módulo definido.');
    } else {
        manifest.modules.forEach((mod, idx) => {
            if (!mod.type) {
                errors.push(`Módulo ${idx + 1} sem campo "type" (o jogo não sabe se este módulo é de comportamento ou textura).`);
            }
            if (!mod.uuid) {
                warnings.push(`Módulo ${idx + 1} sem "uuid" próprio (recomendado ter identificador único).`);
            } else if (!uuidRegex.test(mod.uuid)) {
                warnings.push(`UUID do módulo ${idx + 1} é inválido (formato de código incorreto).`);
            } else if (manifest.header?.uuid && mod.uuid.toLowerCase() === manifest.header.uuid.toLowerCase()) {
                errors.push(`UUID do módulo ${idx + 1} é idêntico ao UUID do header (cada parte do mod precisa de um código diferente, senão o jogo não carrega!).`);
            }
        });
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}
