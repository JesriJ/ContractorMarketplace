"use client";

import { useId, useState } from "react";
import { upload } from "@vercel/blob/client";

type ImageUploadFolder = "jobs" | "profiles" | "portfolio";

type ImageUploadFieldProps = {
  name: string;
  label: string;
  folder: ImageUploadFolder;
  maxFiles: number;
  defaultUrls?: string[];
  helpText?: string;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES = 5 * 1024 * 1024;

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "image";
}

export function ImageUploadField({
  name,
  label,
  folder,
  maxFiles,
  defaultUrls = [],
  helpText,
}: ImageUploadFieldProps) {
  const inputId = useId();
  const [urls, setUrls] = useState<string[]>(defaultUrls.filter(Boolean));
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function onFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const remaining = maxFiles - urls.length;
    if (remaining <= 0) {
      setError(`You can upload up to ${maxFiles} image${maxFiles === 1 ? "" : "s"}.`);
      return;
    }

    const files = Array.from(fileList).slice(0, remaining);
    setUploading(true);

    try {
      const uploaded: string[] = [];
      for (const file of files) {
        if (!ACCEPT.split(",").includes(file.type)) {
          throw new Error("Use JPEG, PNG, WebP, or GIF images.");
        }
        if (file.size > MAX_BYTES) {
          throw new Error("Each image must be 5 MB or smaller.");
        }

        const blob = await upload(`${folder}/${sanitizeFileName(file.name)}`, file, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
          multipart: file.size > 1_000_000,
        });
        uploaded.push(blob.url);
      }

      setUrls((current) => {
        if (maxFiles === 1) return uploaded.slice(0, 1);
        return [...current, ...uploaded].slice(0, maxFiles);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setError(
        message.includes("BLOB_READ_WRITE_TOKEN") || message.includes("token")
          ? "Image uploads need BLOB_READ_WRITE_TOKEN in your environment (create a Blob store in Vercel)."
          : message,
      );
    } finally {
      setUploading(false);
    }
  }

  function removeAt(index: number) {
    setUrls((current) => current.filter((_, i) => i !== index));
  }

  return (
    <div className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input type="hidden" name={name} value={urls.join("\n")} />

      {urls.length > 0 ? (
        <ul className="mb-3 grid gap-3 sm:grid-cols-2">
          {urls.map((url, index) => (
            <li key={url} className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-36 w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="absolute right-2 top-2 rounded bg-white/90 px-2 py-1 text-xs font-medium text-slate-800 shadow-sm hover:bg-white"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {urls.length < maxFiles ? (
        <label
          htmlFor={inputId}
          className={`inline-flex cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 ${
            uploading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {uploading ? "Uploading..." : maxFiles === 1 ? "Choose image" : "Add images"}
          <input
            id={inputId}
            type="file"
            accept={ACCEPT}
            multiple={maxFiles > 1}
            disabled={uploading}
            className="sr-only"
            onChange={(event) => {
              void onFilesSelected(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      ) : null}

      {helpText ? <span className="mt-1 block text-xs text-slate-500">{helpText}</span> : null}
      {error ? (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
