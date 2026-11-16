"use client";

import { Button, Form, Input, TextField, toast } from "@heroui/react";
import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  return (
    <Form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        toast.success("สมัครรับข่าวสารเรียบร้อย (เดโม)", { description: email });
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
