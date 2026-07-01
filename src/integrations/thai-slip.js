import { toISODate } from "../utils/date.js";

const MAX_THUMBNAIL_SIZE = 360;

function hashText(value) {
  let hash = 0;
  const input = String(value || "");
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function parseEmvFields(payload) {
  const fields = {};
  let index = 0;

  while (index + 4 <= payload.length) {
    const id = payload.slice(index, index + 2);
    const length = Number(payload.slice(index + 2, index + 4));
    if (!/^\d{2}$/.test(id) || !Number.isFinite(length) || length < 0) break;

    const valueStart = index + 4;
    const valueEnd = valueStart + length;
    if (valueEnd > payload.length) break;

    fields[id] = payload.slice(valueStart, valueEnd);
    index = valueEnd;
  }

  return fields;
}

function findReference(payload, fields) {
  const nested = ["62", "80", "81", "82"].flatMap((field) => {
    const value = fields[field];
    return value ? Object.values(parseEmvFields(value)) : [];
  });
  const candidates = [
    ...nested,
    fields["01"],
    fields["05"],
    fields["62"],
    payload.match(/[A-Z0-9]{12,}/i)?.[0]
  ].filter(Boolean);

  return String(candidates[0] || `slip_${hashText(payload)}`).slice(0, 80);
}

function findDate(payload, file) {
  const compact = payload.match(/(20\d{2})(\d{2})(\d{2})/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;

  const separated = payload.match(/(20\d{2})[-/](\d{1,2})[-/](\d{1,2})/);
  if (separated) return `${separated[1]}-${separated[2].padStart(2, "0")}-${separated[3].padStart(2, "0")}`;

  return file?.lastModified ? toISODate(new Date(file.lastModified)) : toISODate(new Date());
}

function parseQrPayload(payload, file) {
  const fields = parseEmvFields(payload);
  const amount = Number(fields["54"]) || Number(payload.match(/(?:THB|บาท|AMT|amount)[^\d]*(\d+(?:\.\d{1,2})?)/i)?.[1]) || 0;
  const recipient = fields["59"] || fields["60"] || "";
  const reference = findReference(payload, fields);

  return {
    amount,
    date: findDate(payload, file),
    recipient,
    reference,
    currency: fields["53"] === "764" ? "THB" : "THB",
    raw: payload,
    fieldCount: Object.keys(fields).length
  };
}

async function imageToBitmap(file) {
  if ("createImageBitmap" in window) return createImageBitmap(file);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("อ่านรูปสลิปไม่สำเร็จ"));
    image.src = URL.createObjectURL(file);
  });
}

async function createThumbnail(file) {
  const bitmap = await imageToBitmap(file);
  const width = bitmap.width || bitmap.naturalWidth;
  const height = bitmap.height || bitmap.naturalHeight;
  const scale = Math.min(1, MAX_THUMBNAIL_SIZE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if (typeof bitmap.close === "function") bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.72);
}

async function decodeQrPayloads(file) {
  if (!("BarcodeDetector" in window)) return { payloads: [], reason: "browser_no_qr_reader" };

  const Detector = window.BarcodeDetector;
  if (typeof Detector.getSupportedFormats === "function") {
    const formats = await Detector.getSupportedFormats();
    if (!formats.includes("qr_code")) return { payloads: [], reason: "qr_not_supported" };
  }

  const detector = new Detector({ formats: ["qr_code"] });
  const bitmap = await imageToBitmap(file);
  const barcodes = await detector.detect(bitmap);
  if (typeof bitmap.close === "function") bitmap.close();

  return {
    payloads: barcodes.map((barcode) => barcode.rawValue).filter(Boolean),
    reason: barcodes.length ? "" : "qr_not_found"
  };
}

export async function readThaiSlipFile(file) {
  const [thumbnail, qrResult] = await Promise.all([
    createThumbnail(file).catch(() => ""),
    decodeQrPayloads(file).catch((error) => ({ payloads: [], reason: error.message || "qr_error" }))
  ]);
  const payload = qrResult.payloads[0] || "";
  const parsed = payload ? parseQrPayload(payload, file) : {};
  const amount = Number(parsed.amount) || 0;
  const reference = parsed.reference || `file_${hashText(`${file.name}:${file.size}:${file.lastModified}`)}`;
  const missingFields = [
    !amount ? "amount" : "",
    !payload ? "qr" : "",
    "title",
    "category"
  ].filter(Boolean);

  return {
    fileName: file.name,
    fileSize: file.size,
    importedAt: new Date().toISOString(),
    date: parsed.date || (file.lastModified ? toISODate(new Date(file.lastModified)) : toISODate(new Date())),
    amount,
    recipient: parsed.recipient || "",
    reference,
    thumbnail,
    qrPayload: payload,
    qrStatus: payload ? "read" : qrResult.reason || "qr_not_found",
    missingFields,
    status: "needs_review"
  };
}

export async function readThaiSlipFiles(fileList) {
  const files = [...(fileList || [])].filter((file) => file?.type?.startsWith("image/"));
  const results = [];

  for (const file of files) {
    results.push(await readThaiSlipFile(file));
  }

  return results;
}
