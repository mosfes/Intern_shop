"use client";

import { Button, Chip, Modal } from "@heroui/react";
import Image from "next/image";
import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { MAX_PRODUCT_IMAGES, MAX_PRODUCT_IMAGE_BYTES, PRODUCT_IMAGE_ACCEPT, PRODUCT_IMAGE_TYPES } from "@/lib/product-image-policy";

type Props = { images: string[]; draftId: string; onChange: (images: string[]) => void; pending: boolean; onUploadingChange: (uploading: boolean) => void; maxImages?: number; label?: string; required?: boolean; fallbackPreview?: ReactNode };

export function ProductImages({ images, draftId, onChange, pending, onUploadingChange, maxImages = MAX_PRODUCT_IMAGES, label = "รูปภาพสินค้า", required = true, fallbackPreview }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [fileOver, setFileOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const busy = pending || !!progress;
  const single = maxImages === 1;
  const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes("Files");

  async function upload(files: File[]) {
    setError("");
    if (!files.length) return;
    if (single && files.length > 1) { setError("เลือกรูปภาพได้ครั้งละ 1 รูป"); return; }
    if (!single && images.length + files.length > maxImages) { setError(`เพิ่มรูปภาพได้สูงสุด ${maxImages} รูป`); return; }
    if (files.some((file) => !PRODUCT_IMAGE_TYPES.includes(file.type))) { setError("รองรับเฉพาะรูป JPG, PNG และ WebP"); return; }
    if (files.some((file) => !file.size || file.size > MAX_PRODUCT_IMAGE_BYTES)) { setError("รูปภาพแต่ละรูปต้องไม่ว่างเปล่าและมีขนาดไม่เกิน 8 MB"); return; }
    const next = single ? [] : [...images];
    setProgress({ completed: 0, total: files.length }); onUploadingChange(true);
    try {
      for (let index = 0; index < files.length; index++) {
        const form = new FormData(); form.set("file", files[index]);
        form.set("draftId", draftId);
        const response = await fetch("/api/admin/products/images", { method: "POST", body: form });
        if (response.status === 401 || response.status === 403) { window.location.replace("/auth/complete"); throw new Error("กรุณาตรวจสอบสิทธิ์การใช้งาน"); }
        let result;
        try { result = await response.json(); } catch { throw new Error("อัปโหลดรูปไม่สำเร็จ กรุณาลองอีกครั้ง"); }
        if (!response.ok || typeof result.image?.url !== "string") throw new Error(result.error || "อัปโหลดรูปไม่สำเร็จ กรุณาลองอีกครั้ง");
        next.push(result.image.url); onChange([...next]);
        setProgress({ completed: index + 1, total: files.length });
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "อัปโหลดรูปไม่สำเร็จ กรุณาลองอีกครั้ง"); }
    finally { setProgress(null); onUploadingChange(false); }
  }

  function move(index: number, destination: number) {
    const next = [...images];
    const [image] = next.splice(index, 1); next.splice(destination, 0, image); onChange(next);
  }

  const dropProps = {
    onDragOver: (event: DragEvent) => { if (!hasFiles(event)) return; event.preventDefault(); event.dataTransfer.dropEffect = busy ? "none" : "copy"; if (!busy) setFileOver(true); },
    onDragLeave: (event: DragEvent<HTMLElement>) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFileOver(false); },
    onDrop: (event: DragEvent) => { if (!hasFiles(event)) return; event.preventDefault(); setFileOver(false); if (!busy) void upload(Array.from(event.dataTransfer.files)); },
  };
  const fileInput = <input ref={input} type="file" accept={PRODUCT_IMAGE_ACCEPT} multiple={maxImages > 1} className="hidden" aria-label={`เลือกไฟล์${label}`} disabled={busy} onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void upload(files); }} />;

  const confirmRemove = <Modal.Backdrop isOpen={removing !== null} onOpenChange={(open) => { if (!open) setRemoving(null); }}><Modal.Container size="sm" placement="center"><Modal.Dialog className="rounded-2xl bg-overlay p-0 text-foreground">
    <Modal.CloseTrigger /><Modal.Header className="px-6 pt-6"><Modal.Heading>นำรูปภาพออก</Modal.Heading></Modal.Header>
    <Modal.Body className="px-6 py-4">
      {removing !== null && images[removing] && <div className="relative mx-auto mb-3 size-28 overflow-hidden rounded-lg border border-border bg-white"><Image src={images[removing]} alt="" fill sizes="112px" className="object-contain p-2" /></div>}
      <p className="text-sm">ต้องการนำ{single ? label : `รูปที่ ${(removing ?? 0) + 1}`}ออกหรือไม่?</p>
      <p className="mt-2 text-xs text-muted">หากปิดฟอร์มโดยไม่บันทึก รูปที่บันทึกไว้เดิมจะยังอยู่</p>
    </Modal.Body>
    <Modal.Footer className="flex justify-end gap-4 border-t border-border px-6 py-4"><button type="button" onClick={() => setRemoving(null)} className="text-sm text-muted">ยกเลิก</button><button type="button" onClick={() => { if (removing !== null) onChange(images.filter((_, i) => i !== removing)); setRemoving(null); }} className="rounded-lg bg-danger px-5 py-2.5 text-sm font-semibold text-white">ยืนยันนำออก</button></Modal.Footer>
  </Modal.Dialog></Modal.Container></Modal.Backdrop>;

  if (single) return <div className="space-y-3" role="group" aria-label={label} {...dropProps}>
    <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{label}{required && " *"}</p><span className="text-xs tabular-nums text-muted">{images.length}/1 รูป</span></div>
    {fileInput}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
      <div className="relative size-36 shrink-0 self-center overflow-hidden rounded-xl border border-border bg-white sm:self-auto">
        {images[0] ? <Image src={images[0]} alt={label} fill draggable={false} sizes="144px" className="object-contain p-3" />
          : fallbackPreview ? <div role="img" aria-label={`${label}ที่ใช้อยู่`} className="grid size-full place-items-center pb-5">{fallbackPreview}</div>
          : <div className="grid size-full place-items-center text-muted/50"><PlusIcon size={28} /></div>}
        {!images[0] && fallbackPreview && <span className="absolute inset-x-0 bottom-0 bg-surface-secondary/90 py-1 text-center text-[11px] text-muted">โลโก้เริ่มต้น</span>}
        {progress && <div role="status" className="absolute inset-0 grid place-items-center bg-white/80"><span className="size-7 animate-spin rounded-full border-[3px] border-accent/25 border-t-accent motion-reduce:animate-none" /><span className="sr-only">กำลังอัปโหลดรูปภาพ…</span></div>}
        {images[0] && !progress && <button type="button" disabled={busy} aria-label="นำรูปภาพออก" onClick={() => setRemoving(0)} className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-surface/90 text-muted shadow-sm ring-1 ring-border hover:text-danger disabled:opacity-40"><TrashIcon size={14} /></button>}
      </div>
      <div className={`flex min-h-36 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-center transition-colors ${fileOver ? "border-accent bg-accent-soft" : "border-border bg-surface-secondary/40"}`}>
        <Button type="button" variant="secondary" isDisabled={busy} isPending={!!progress} onPress={() => input.current?.click()}><PlusIcon size={17} />{progress ? "กำลังอัปโหลด…" : images.length ? "เปลี่ยนรูปภาพ" : "อัปโหลดรูปภาพ"}</Button>
        <p className="text-xs leading-relaxed text-muted">{fileOver ? "ปล่อยเมาส์เพื่ออัปโหลดรูป" : "คลิกเลือกไฟล์ หรือลากรูปมาวางที่นี่"}<br />JPG, PNG หรือ WebP · ไม่เกิน 8 MB</p>
      </div>
    </div>
    {error && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}
    {confirmRemove}
  </div>;

  return <div className="space-y-3" role="group" aria-label={label}
    onDragOver={(event) => { if (!hasFiles(event)) return; event.preventDefault(); event.dataTransfer.dropEffect = busy ? "none" : "copy"; if (!busy) setFileOver(true); }}
    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFileOver(false); }}
    onDrop={(event) => { if (!hasFiles(event)) return; event.preventDefault(); setFileOver(false); if (!busy) void upload(Array.from(event.dataTransfer.files)); }}>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-medium">{label}{required && " *"}</p><span className="text-xs tabular-nums text-muted">{images.length}/{maxImages} รูป</span></div>
    <input ref={input} type="file" accept={PRODUCT_IMAGE_ACCEPT} multiple={maxImages > 1} className="hidden" aria-label={`เลือกไฟล์${label}`} disabled={busy} onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void upload(files); }} />
    <div className={`rounded-xl border border-dashed p-4 text-center transition-colors ${fileOver ? "border-accent bg-accent-soft" : "border-border bg-surface-secondary/40"}`}>
      <Button type="button" variant="secondary" isDisabled={busy || images.length >= maxImages} isPending={!!progress} onPress={() => input.current?.click()}><PlusIcon size={17} />{progress ? "กำลังอัปโหลด…" : "อัปโหลดรูปภาพ"}</Button>
      <p className="mt-2 text-xs text-muted">{fileOver ? "ปล่อยเมาส์เพื่ออัปโหลดรูป" : "คลิกเลือกไฟล์ หรือลากรูปมาวางที่นี่ได้"} · JPG, PNG หรือ WebP · ไม่เกิน 8 MB ต่อรูป</p>
      {maxImages > 1 && <p className="mt-1 text-xs text-muted">รูปแรกเป็นรูปหลัก ลากรูปด้านล่างเพื่อย้ายตำแหน่งได้ตามต้องการ</p>}
    </div>
    {progress && <div role="status" className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm text-accent"><span className="flex items-center gap-2"><span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent motion-reduce:animate-none" />กำลังอัปโหลดรูปภาพ…</span><span className="tabular-nums">{progress.completed}/{progress.total} รูป</span></div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-border" aria-hidden="true"><div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${(progress.completed / progress.total) * 100}%` }} /><div className="h-full animate-pulse bg-accent/50 motion-reduce:animate-none" style={{ width: `${(1 / progress.total) * 100}%` }} /></div>
    </div>}
    {error && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}
    {!images.length && !progress && fallbackPreview && <div role="img" aria-label={`${label}ที่ใช้อยู่`} className="w-40 overflow-hidden rounded-lg border border-border bg-surface"><div className="grid aspect-square place-items-center bg-white">{fallbackPreview}</div><p className="border-t border-border p-2 text-center text-xs text-muted">รูปที่ใช้อยู่ · โลโก้เริ่มต้น</p></div>}
    {(!!images.length || !!progress) && <ol className={maxImages === 1 ? "grid w-40 grid-cols-1 gap-3" : "grid grid-cols-2 gap-3 sm:grid-cols-4"}>{images.map((url, index) => <li key={`${url}-${index}`} draggable={!busy && maxImages > 1}
      onDragStart={(event) => { setDragIndex(index); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(index)); }}
      onDragOver={(event) => { if (dragIndex === null) return; event.preventDefault(); event.dataTransfer.dropEffect = "move"; if (overIndex !== index) setOverIndex(index); }}
      onDrop={(event) => { if (dragIndex === null) return; event.preventDefault(); if (dragIndex !== index) move(dragIndex, index); setDragIndex(null); setOverIndex(null); }}
      onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
      className={`overflow-hidden rounded-lg border bg-surface transition ${busy || maxImages === 1 ? "" : "cursor-grab active:cursor-grabbing"} ${dragIndex === index ? "opacity-40" : ""} ${overIndex === index && dragIndex !== null && dragIndex !== index ? "ring-2 ring-accent" : ""} ${index === 0 ? "border-accent/50" : "border-border"}`}>
      <div className="relative aspect-square bg-white"><Image src={url} alt={`${label} ${index + 1}`} fill draggable={false} sizes="(max-width: 640px) 40vw, 220px" className="object-contain p-2" />{index === 0 && <Chip size="sm" color="accent" className="absolute left-2 top-2">{maxImages > 1 ? "รูปหลัก" : label}</Chip>}</div>
      <div className="space-y-2 border-t border-border p-2">
        {index > 0 && <button type="button" disabled={busy} onClick={() => move(index, 0)} className="w-full rounded-md py-1 text-xs text-accent hover:bg-accent-soft disabled:opacity-50">ใช้เป็นรูปหลัก</button>}
        <div className="flex items-center justify-between gap-1"><div className={maxImages > 1 ? "flex gap-1" : "hidden"}><button type="button" disabled={busy || index === 0} aria-label={`เลื่อนรูปที่ ${index + 1} ไปก่อนหน้า`} onClick={() => move(index, index - 1)} className="rounded-md p-1.5 text-muted hover:bg-surface-secondary disabled:opacity-40"><ChevronLeftIcon size={16} /></button><button type="button" disabled={busy || index === images.length - 1} aria-label={`เลื่อนรูปที่ ${index + 1} ไปถัดไป`} onClick={() => move(index, index + 1)} className="rounded-md p-1.5 text-muted hover:bg-surface-secondary disabled:opacity-40"><ChevronRightIcon size={16} /></button></div><button type="button" disabled={busy} aria-label={`นำรูปที่ ${index + 1} ออก`} onClick={() => setRemoving(index)} className="rounded-md p-1.5 text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-40"><TrashIcon size={16} /></button></div>
      </div>
    </li>)}{progress && Array.from({ length: progress.total - progress.completed }, (_, i) => <li key={`uploading-${progress.completed + i}`} aria-hidden="true" className="overflow-hidden rounded-lg border border-dashed border-accent/40 bg-surface">
      <div className="relative grid aspect-square place-items-center bg-surface-secondary/60"><div className="absolute inset-0 animate-pulse bg-accent/5 motion-reduce:animate-none" /><div className="relative flex flex-col items-center gap-2 text-xs text-accent"><span className="size-7 animate-spin rounded-full border-[3px] border-accent/25 border-t-accent motion-reduce:animate-none" />{i === 0 ? "กำลังอัปโหลด…" : "รอคิว"}</div></div>
      <div className="h-[74px] border-t border-border" />
    </li>)}</ol>}
    {confirmRemove}
  </div>;
}
