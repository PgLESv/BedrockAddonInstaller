export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    if (!bytes || isNaN(bytes)) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function truncateName(name, maxLen = 35) {
    if (!name || name.length <= maxLen) return name || '';
    const ext = name.lastIndexOf('.');
    const extension = ext > -1 ? name.slice(ext) : '';
    const baseName = ext > -1 ? name.slice(0, ext) : name;
    const truncLen = maxLen - extension.length - 3;
    return (truncLen > 0 ? baseName.slice(0, truncLen) : baseName) + '...' + extension;
}

export function getFileIcon(fileName) {
    const name = (fileName || '').toLowerCase();
    if (name.endsWith('.mcworld')) return '🌍';
    if (name.endsWith('.mcpack') || name.endsWith('.mcaddon')) return '📦';
    if (name.endsWith('.zip')) return '🗜️';
    if (name.endsWith('.tar') || name.endsWith('.gz') || name.endsWith('.tgz')) return '📁';
    return '📄';
}
