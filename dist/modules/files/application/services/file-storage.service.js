"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileStorageService = void 0;
exports.buildGeneratedFileName = buildGeneratedFileName;
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const env_1 = require("../../../../config/env");
const app_error_1 = require("../../../../shared/errors/app-error");
class FileStorageService {
    rootPath = path_1.default.resolve(process.cwd(), env_1.env.FILE_STORAGE_PATH);
    validate(file) {
        const allowed = env_1.env.ALLOWED_UPLOAD_MIME_TYPES.split(',').map((value) => value.trim());
        const maxBytes = env_1.env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;
        if (!allowed.includes(file.mimetype)) {
            throw new app_error_1.AppError('Invalid file type', 400, 'INVALID_FILE_TYPE');
        }
        if (file.size > maxBytes) {
            throw new app_error_1.AppError('File is too large', 400, 'FILE_TOO_LARGE');
        }
    }
    async save(file, context) {
        this.validate(file);
        const prepared = await this.prepareFile(file);
        const checksumSha256 = crypto_1.default.createHash('sha256').update(prepared.buffer).digest('hex');
        const id = crypto_1.default.randomUUID();
        const generatedName = buildGeneratedFileName(new Date(), id, prepared.extension);
        const storedName = generatedName;
        const relativeDirectory = path_1.default.join(context.category, context.eventId ?? 'general');
        const absoluteDirectory = path_1.default.join(this.rootPath, relativeDirectory);
        const absolutePath = path_1.default.join(absoluteDirectory, storedName);
        const relativePath = path_1.default.join(relativeDirectory, storedName);
        await promises_1.default.mkdir(absoluteDirectory, { recursive: true });
        await promises_1.default.writeFile(absolutePath, prepared.buffer);
        return {
            originalName: generatedName,
            storedName,
            storagePath: relativePath,
            checksumSha256,
            mimeType: prepared.mimeType,
            sizeBytes: prepared.buffer.length,
        };
    }
    async prepareFile(file) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
            return {
                buffer: file.buffer,
                extension: path_1.default.extname(file.originalname).toLowerCase() || extensionForMimeType(file.mimetype),
                mimeType: file.mimetype,
            };
        }
        try {
            const image = (0, sharp_1.default)(file.buffer, { failOn: 'error' }).rotate();
            const metadata = await image.metadata();
            const resized = image.resize({
                width: 2560,
                height: 2560,
                fit: 'inside',
                withoutEnlargement: true,
            });
            const optimizedBuffer = metadata.hasAlpha
                ? await resized.webp({ lossless: true, effort: 6 }).toBuffer()
                : await resized.webp({ quality: 90, smartSubsample: true, effort: 6 }).toBuffer();
            return {
                buffer: optimizedBuffer,
                extension: '.webp',
                mimeType: 'image/webp',
            };
        }
        catch {
            throw new app_error_1.AppError('Invalid or corrupt image', 400, 'INVALID_IMAGE');
        }
    }
    getAbsolutePath(storagePath) {
        const absolutePath = path_1.default.resolve(this.rootPath, storagePath);
        const relative = path_1.default.relative(this.rootPath, absolutePath);
        if (relative.startsWith('..') || path_1.default.isAbsolute(relative)) {
            throw new app_error_1.AppError('Invalid storage path', 400, 'INVALID_STORAGE_PATH');
        }
        return absolutePath;
    }
    async createSponsorLogoVariant(storagePath) {
        const absolutePath = this.getAbsolutePath(storagePath);
        try {
            const input = await promises_1.default.readFile(absolutePath);
            const source = (0, sharp_1.default)(input, { failOn: 'error' }).rotate();
            const metadata = await source.metadata();
            const trimmed = source.trim({ threshold: 18 });
            return metadata.hasAlpha
                ? await trimmed.webp({ lossless: true, effort: 6 }).toBuffer()
                : await trimmed.webp({ quality: 92, smartSubsample: true, effort: 6 }).toBuffer();
        }
        catch {
            throw new app_error_1.AppError('Invalid or corrupt image', 400, 'INVALID_IMAGE');
        }
    }
    async createSpeakerPhotoVariant(storagePath) {
        const absolutePath = this.getAbsolutePath(storagePath);
        try {
            const input = await promises_1.default.readFile(absolutePath);
            const source = (0, sharp_1.default)(input, { failOn: 'error' }).rotate();
            const metadata = await source.metadata();
            const photo = metadata.hasAlpha
                ? source.trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 2 })
                : source;
            return metadata.hasAlpha
                ? await photo.webp({ lossless: true, effort: 6 }).toBuffer()
                : await photo.webp({ quality: 92, smartSubsample: true, effort: 6 }).toBuffer();
        }
        catch {
            throw new app_error_1.AppError('Invalid or corrupt image', 400, 'INVALID_IMAGE');
        }
    }
    async remove(storagePath) {
        const absolutePath = this.getAbsolutePath(storagePath);
        await promises_1.default.rm(absolutePath, { force: true });
    }
}
exports.FileStorageService = FileStorageService;
function buildGeneratedFileName(date, id, extension) {
    const timestamp = [
        date.getUTCFullYear(),
        String(date.getUTCMonth() + 1).padStart(2, '0'),
        String(date.getUTCDate()).padStart(2, '0'),
        '-',
        String(date.getUTCHours()).padStart(2, '0'),
        String(date.getUTCMinutes()).padStart(2, '0'),
        String(date.getUTCSeconds()).padStart(2, '0'),
    ].join('');
    const safeExtension = extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
    return `${timestamp}-${id}${safeExtension}`;
}
function extensionForMimeType(mimeType) {
    const extensions = {
        'application/pdf': '.pdf',
        'application/zip': '.zip',
        'application/x-zip-compressed': '.zip',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/vnd.ms-powerpoint': '.ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
        'application/vnd.ms-excel': '.xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    };
    return extensions[mimeType] ?? '.bin';
}
//# sourceMappingURL=file-storage.service.js.map