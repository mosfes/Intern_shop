"use client";

import { Button, Form, Input, TextField } from "@heroui/react";
import { useFeedback } from "@/components/feedback-provider";
import { useState } from "react";

export function NewsletterForm() {
  const showFeedback = useFeedback();
  const [email, setEmail] = useState("");
  return (
    <Form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        showFeedback({ title: "สมัครรับข่าวสารสำเร็จ (เดโม)", description: `อีเมลที่ใช้รับข่าวสาร: ${email}` });
        setEmail("");
      }}
    >
      <TextField aria-label="อีเมล" type="email" isRequired value={email} onChange={setEmail} className="flex-1">
        <Input placeholder="you@email.com" />
      </TextField>
      <Button type="submit">สมัคร</Button>
    </Form>
  );
}
