"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Upload PDF button (knife-2 slice 1)
 *
 * Client-side guards mirror the server rules (fail-closed on the server):
 * PDF files only, ≤ 50MB. Upload bytes go straight to storage via a
 * presigned PUT; failures surface a toast and never strand metadata
 * (the hook rolls the row back).
 */
import { FileUp, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@workspace/ui-web/button";

import { useUploadPdf } from "./use-pdfs";

const MAX_SIZE = 50 * 1024 * 1024;

export function UploadPdfButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const upload = useUploadPdf();

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("只支持 PDF 文件");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("文件超过 50MB 上限");
      return;
    }
    setBusy(true);
    try {
      const result = await upload.mutateAsync({
        input: { fileName: file.name, fileSizeBytes: file.size },
        file,
      });
      if (result.id.startsWith("local_pdf_")) {
        toast.success("PDF 元数据已保存到本地（服务器暂不可用）");
      } else {
        toast.success("上传成功");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "上传失败");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        size="sm"
      >
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileUp className="mr-2 h-4 w-4" />
        )}
        上传 PDF
      </Button>
    </>
  );
}
