"use client";

import { Table, Tabs } from "@heroui/react";
import { CheckCircleIcon } from "@/components/icons";
import type { Product } from "@/lib/types";

export function DetailTabs({ product }: { product: Product }) {
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

    </Tabs>
  );
}
