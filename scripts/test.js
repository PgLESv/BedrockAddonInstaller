import assert from 'node:assert';
import { removeJsonComments, detectPackType, parseManifestSafe } from '../src/parsers/manifest.js';
import { escapeHtml, sanitizeFolderName } from '../src/utils/security.js';
import { formatFileSize, truncateName, getFileIcon } from '../src/utils/formatters.js';
import { isArchiveFile } from '../src/parsers/archive.js';
import { formatPacksJson } from '../src/services/packService.js';

console.log('🧪 Iniciando suite de testes automatizados...\n');

// 1. Parser de manifest e comentários
console.log('1. Testando removeJsonComments e preservação de URLs...');
const jsonWithUrl = `{
  "name": "Pack with // comments and https:// URLs",
  "url": "https://github.com/my-repo",
  // line comment
  "nested": {
    /* block comment */
    "desc": "Text with // inside string"
  },
  "trailing": [1, 2, ],
}`;
const cleaned = removeJsonComments(jsonWithUrl);
const parsed = JSON.parse(cleaned);
assert.strictEqual(parsed.url, 'https://github.com/my-repo', 'A URL não deve ser truncada!');
assert.strictEqual(parsed.name, 'Pack with // comments and https:// URLs');
assert.strictEqual(parsed.nested.desc, 'Text with // inside string');
assert.strictEqual(parsed.trailing.length, 2);

// Teste de remoção de UTF-8 BOM (Windows / Notepad)
const jsonWithBom = '\uFEFF' + jsonWithUrl;
const cleanedBom = removeJsonComments(jsonWithBom);
const parsedBom = JSON.parse(cleanedBom);
assert.strictEqual(parsedBom.url, 'https://github.com/my-repo', 'BOM deve ser removido com sucesso');
console.log('  ✅ removeJsonComments e remoção de UTF-8 BOM validados com sucesso.');

// 2. Módulos Bedrock Script API
console.log('2. Testando detecção de módulos Bedrock...');
assert.strictEqual(detectPackType({ modules: [{ type: 'data' }] }), 'behavior');
assert.strictEqual(detectPackType({ modules: [{ type: 'script' }] }), 'behavior');
assert.strictEqual(detectPackType({ modules: [{ type: 'javascript' }] }), 'behavior');
assert.strictEqual(detectPackType({ modules: [{ type: 'client_data' }] }), 'behavior');
assert.strictEqual(detectPackType({ modules: [{ type: 'resources' }] }), 'resource');
assert.strictEqual(detectPackType({ modules: [{ type: 'skin_pack' }] }), 'resource');
assert.strictEqual(detectPackType({ modules: [{ type: 'invalid_type' }] }), null);
console.log('  ✅ detectPackType validado com sucesso.');

// 3. Fallback de manifest corrompido
console.log('3. Testando parseManifestSafe com manifest corrompido...');
const brokenJson = `{ "header": { "name": "Broken", "uuid": "12345678-1234-1234-1234-123456789abc", "version": [2, 1, 0] } INVALID_SYNTAX }`;
const { manifest, isCorrupted } = parseManifestSafe(brokenJson, 'FallbackPack');
assert.strictEqual(isCorrupted, true);
assert.strictEqual(manifest.header.uuid, '12345678-1234-1234-1234-123456789abc', 'Deve extrair UUID essencial mesmo em JSON quebrado!');
assert.deepStrictEqual(manifest.header.version, [2, 1, 0]);
console.log('  ✅ parseManifestSafe e extração essencial validados.');

// 4. Segurança e sanitização
console.log('4. Testando escapeHtml e sanitizeFolderName...');
const unsafe = `<script>alert("xss")</script> & Bob's Pack`;
const safe = escapeHtml(unsafe);
assert.ok(!safe.includes('<') && !safe.includes('>') && !safe.includes('"') && !safe.includes("'"));
assert.strictEqual(sanitizeFolderName('Pack: With / Invalid * Chars?'), 'Pack_ With _ Invalid _ Chars_');
console.log('  ✅ escapeHtml e sanitizeFolderName validados.');

// 5. Formatadores
console.log('5. Testando formatters...');
assert.strictEqual(formatFileSize(0), '0 Bytes');
assert.strictEqual(formatFileSize(1024), '1 KB');
assert.strictEqual(formatFileSize(1024 * 1024 * 5), '5 MB');
assert.strictEqual(truncateName('small.zip', 20), 'small.zip');
assert.strictEqual(truncateName('very_long_file_name_that_exceeds_limit.mcpack', 25).endsWith('.mcpack'), true);
assert.strictEqual(getFileIcon('world.mcworld'), '🌍');
assert.strictEqual(getFileIcon('addon.mcpack'), '📦');
assert.strictEqual(getFileIcon('archive.zip'), '🗜️');
assert.strictEqual(isArchiveFile('test.mcpack'), true);
assert.strictEqual(isArchiveFile('test.rar'), false);
assert.strictEqual(isArchiveFile('test.7z'), false);
console.log('  ✅ formatters e archive types validados.');

// 6. Serialização JSON de ativação
console.log('6. Testando formatPacksJson...');
const activeSample = [{ pack_id: 'abc-123', version: [1, 0, 0] }];
const jsonOutput = formatPacksJson(activeSample);
const parsedActive = JSON.parse(jsonOutput);
assert.strictEqual(parsedActive[0].pack_id, 'abc-123');
assert.deepStrictEqual(parsedActive[0].version, [1, 0, 0]);
console.log('  ✅ formatPacksJson validado.');

// 7. Prevenção de colisão de nomes de pastas
console.log('7. Testando algoritmo de prevenção de colisão de pastas...');
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
const p1 = getUniqueFolder('behavior_packs', 'Super Pack');
const p2 = getUniqueFolder('behavior_packs', 'Super Pack');
const p3 = getUniqueFolder('behavior_packs', 'Super Pack');
assert.strictEqual(p1, 'behavior_packs/Super Pack/');
assert.strictEqual(p2, 'behavior_packs/Super Pack_2/');
assert.strictEqual(p3, 'behavior_packs/Super Pack_3/');

// Teste de normalização de caminhos de mapa exportados (eliminação de 'Bedrock level/')
function testCleanWorldPackPath(originalPath, defaultPrefix, packName) {
    if (originalPath) {
        let p = originalPath.replace(/\\/g, '/').replace(/^\/+/, '');
        const bpIdx = p.indexOf('behavior_packs/');
        const rpIdx = p.indexOf('resource_packs/');
        const unkIdx = p.indexOf('unknown_packs/');
        if (bpIdx >= 0) p = p.substring(bpIdx);
        else if (rpIdx >= 0) p = p.substring(rpIdx);
        else if (unkIdx >= 0) p = p.substring(unkIdx);
        if (!p.endsWith('/')) p += '/';
        return p;
    }
    return `${defaultPrefix}/${sanitizeFolderName(packName)}/`;
}
assert.strictEqual(
    testCleanWorldPackPath('Bedrock level/behavior_packs/Adventures/', 'behavior_packs', 'Adventures'),
    'behavior_packs/Adventures/'
);
assert.strictEqual(
    testCleanWorldPackPath('My World 1.21/resource_packs/Textures/', 'resource_packs', 'Textures'),
    'resource_packs/Textures/'
);
console.log('  ✅ Prevenção de colisão e normalização de caminhos de exportação validadas com sucesso.');

// 8. Integridade de IDs do index.html
console.log('8. Testando integridade do index.html contra referências da UI...');
import fs from 'node:fs';
const html = fs.readFileSync('index.html', 'utf8');
const requiredIds = [
  'dropZone', 'fileInput', 'filesList', 'actions', 'processBtn', 'clearBtn',
  'progressSection', 'progressFill', 'progressText', 'resultsSection',
  'resultsStats', 'downloadBtn', 'downloadBtnText', 'packsActivation',
  'selectAllBtn', 'deselectAllBtn', 'worldInfo', 'worldName',
  'worldManagement', 'additionalAddons', 'additionalAddonsList',
  'resultsTitle', 'activationTitle', 'activationDescription'
];
for (const id of requiredIds) {
  assert.ok(html.includes(`id="${id}"`), `ID obrigatório ausente no index.html: ${id}`);
}
console.log('  ✅ Todos os 24 IDs do DOM validados.');

// 9. Validador de Schema do Bedrock Manifest
console.log('9. Testando validador de schema validateBedrockManifest...');
import { validateBedrockManifest } from '../src/parsers/manifestValidator.js';

// Caso Válido
const validManifest = {
    format_version: 2,
    header: {
        name: 'Valid Pack',
        uuid: '11111111-2222-3333-4444-555555555555',
        version: [1, 0, 0],
        min_engine_version: [1, 20, 0]
    },
    modules: [
        {
            type: 'data',
            uuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
            version: [1, 0, 0]
        }
    ]
};
const validResult = validateBedrockManifest(validManifest);
assert.strictEqual(validResult.valid, true);
assert.strictEqual(validResult.errors.length, 0);

// Caso Inválido: Falta Header
const noHeaderResult = validateBedrockManifest({});
assert.strictEqual(noHeaderResult.valid, false);
assert.ok(noHeaderResult.errors.some(e => e.includes('header')));

// Caso Inválido: UUID Malformatado
const badUuidResult = validateBedrockManifest({
    header: { name: 'Bad', uuid: 'not-a-valid-uuid', version: [1, 0, 0] },
    modules: [{ type: 'resources' }]
});
assert.strictEqual(badUuidResult.valid, false);
assert.ok(badUuidResult.errors.some(e => e.includes('UUID do cabeçalho')));

// Caso Inválido: Versão que não é array de 3 números
const badVersionResult = validateBedrockManifest({
    header: { name: 'Bad', uuid: '11111111-2222-3333-4444-555555555555', version: '1.0.0' },
    modules: [{ type: 'resources' }]
});
assert.strictEqual(badVersionResult.valid, false);
assert.ok(badVersionResult.errors.some(e => e.includes('Versão')));

// Caso Inválido: UUID do módulo idêntico ao do header
const duplicateUuidResult = validateBedrockManifest({
    header: { name: 'Dup', uuid: '11111111-2222-3333-4444-555555555555', version: [1, 0, 0] },
    modules: [{ type: 'resources', uuid: '11111111-2222-3333-4444-555555555555' }]
});
assert.strictEqual(duplicateUuidResult.valid, false);
assert.ok(duplicateUuidResult.errors.some(e => e.includes('idêntico ao UUID do header')));
console.log('  ✅ validateBedrockManifest validou casos válidos e de erro com perfeição.');

// 10. Arquivos PWA e Offline
console.log('10. Testando integridade dos arquivos PWA (manifest.webmanifest e sw.js)...');
assert.ok(fs.existsSync('manifest.webmanifest'), 'manifest.webmanifest deve existir');
assert.ok(fs.existsSync('sw.js'), 'sw.js deve existir');
const webManifestContent = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
assert.strictEqual(webManifestContent.display, 'standalone');
assert.strictEqual(webManifestContent.start_url, './index.html');
assert.ok(html.includes('href="manifest.webmanifest"'), 'index.html deve conter link para manifest.webmanifest');
console.log('  ✅ PWA webmanifest e Service Worker validados com sucesso.');

console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
