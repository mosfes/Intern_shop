"use client";

import { Avatar, Chip, ProgressBar, Table, Tabs } from "@heroui/react";
import { Rating } from "@/components/product/product-bits";
import { CheckCircleIcon } from "@/components/icons";
import { formatThaiDate } from "@/lib/format";
import type { Product } from "@/lib/types";

/** Plausible rating distribution derived from the average (mock data). */
function distribution(p: Product) {
  const five = Math.round(Math.min(92, Math.max(40, (p.rating - 3.5) * 55)));
  const four = Math.round((100 - five) * 0.62);
  const three = Math.round((100 - five - four) * 0.6);
  const two = Math.round((100 - five - four - three) * 0.6);
  return [five, four, three, two, Math.max(0, 100 - five - four - three - two)];
}

export function DetailTabs({ product }: { product: Product }) {
  const dist = distribution(product);
  return (
    <Tabs defaultSelectedKey="overview">
      <Tabs.ListContainer className="overflow-x-auto no-scrollbar">
        <Tabs.List aria-label="ข้อมูลสินค้า" className="w-max">
          <Tabs.Tab id="overview" className="px-4">
            รายละเอียด
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab id="specs" className="px-4">
            สเปกสินค้า
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab id="reviews" className="px-4">
            รีวิว ({product.reviewCount})
            <Tabs.Indicator />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>

      <Tabs.Panel id="overview" className="pt-6">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4 leading-relaxed text-muted">
            <h2 className="text-xl font-semibold text-foreground">ภาพรวมสินค้า</h2>
            <p>{product.description}</p>
            <p>
              สินค้าทุกชิ้นจาก EDM PC Shop เป็นของแท้ นำเข้าจากผู้จัดจำหน่ายอย่างเป็นทางการ ผ่านการตรวจสอบคุณภาพก่อนจัดส่ง
              และมีทีมงานผู้เชี่ยวชาญพร้อมให้คำปรึกษาการติดตั้งและการใช้งาน
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="mb-3 font-semibold">จุดเด่น</h3>
            <ul className="space-y-2.5 text-sm">
              {product.highlights.map((h) => (
                <li key={h} className="flex gap-2">
                  <CheckCircleIcon size={18} className="shrink-0 text-accent" />
                  {h}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              {product.shortSpecs.map((s) => (
                <Chip key={s} size="sm" variant="soft">
                  {s}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </Tabs.Panel>

      <Tabs.Panel id="specs" className="pt-6">
        <Table className="rounded-xl border border-border">
          <Table.ScrollContainer>
            <Table.Content aria-label={`สเปก ${product.name}`}>
              <Table.Header>
                <Table.Column isRowHeader className="w-1/3">
                  คุณสมบัติ
                </Table.Column>
                <Table.Column>รายละเอียด</Table.Column>
              </Table.Header>
              <Table.Body>
                {[
                  { label: "แบรนด์", value: product.brand },
                  ...product.specifications,
                  { label: "การรับประกัน", value: product.warranty },
                ].map((s) => (
                  <Table.Row key={s.label} id={s.label}>
                    <Table.Cell className="font-medium text-muted">{s.label}</Table.Cell>
                    <Table.Cell>{s.value}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </Tabs.Panel>

      <Tabs.Panel id="reviews" className="pt-6">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <div className="h-fit rounded-xl border border-border bg-surface p-5">
            <p className="text-5xl font-semibold tracking-tight">{product.rating.toFixed(1)}</p>
            <div className="mt-2">
              <Rating value={product.rating} size={18} />
            </div>
            <p className="mt-1 text-sm text-muted">จาก {product.reviewCount.toLocaleString("en-US")} รีวิว</p>
            <div className="mt-5 space-y-2">
              {dist.map((pct, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="w-8 text-muted">{5 - i} ดาว</span>
                  <ProgressBar aria-label={`${5 - i} ดาว ${pct}%`} value={pct} className="flex-1">
                    <ProgressBar.Track>
                      <ProgressBar.Fill />
                    </ProgressBar.Track>
                  </ProgressBar>
                  <span className="w-8 text-right tabular-nums text-muted">{pct}%</span>
                </div>
              ))}
            </div>
          </div>
          <ul className="divide-y divide-border">
            {product.reviews.map((r) => (
              <li key={r.id} className="py-5 first:pt-0">
                <div className="flex items-center gap-3">
                  <Avatar size="sm" variant="soft">
                    <Avatar.Fallback>{r.author.slice(0, 1)}</Avatar.Fallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{r.author}</p>
                    <p className="text-xs text-muted">{formatThaiDate(r.date)}</p>
                  </div>
                  {r.verified && (
                    <Chip size="sm" variant="soft" color="success">
                      ซื้อแล้ว
                    </Chip>
                  )}
                </div>
                <div className="mt-3">
                  <Rating value={r.rating} size={13} />
                </div>
                <p className="mt-2 font-medium">{r.title}</p>
                <p className="mt-1 text-sm text-muted">{r.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </Tabs.Panel>
    </Tabs>
  );
}
