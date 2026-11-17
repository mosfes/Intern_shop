"use client";

import { Modal } from "@heroui/react";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CheckCircleIcon } from "@/components/icons";

type SuccessMessage = { title: string; description: string };
const FeedbackContext = createContext<((message: SuccessMessage) => void) | null>(null);

export function useFeedback() {
  const showFeedback = useContext(FeedbackContext);
  if (!showFeedback) throw new Error("useFeedback must be used within FeedbackProvider");
  return showFeedback;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<SuccessMessage | null>(null);
  const showFeedback = useCallback((nextMessage: SuccessMessage) => {
    setMessage({ ...nextMessage });
  }, []);
  const close = () => setMessage(null);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(null), 3000);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [message]);

  return (
    <FeedbackContext.Provider value={showFeedback}>
      {children}
      <Modal.Backdrop isOpen={message !== null} onOpenChange={(open) => { if (!open) close(); }}>
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog className="overflow-hidden rounded-3xl border border-border bg-surface p-0 shadow-2xl">
            <Modal.CloseTrigger aria-label="ปิดการแจ้งเตือน" className="right-4 top-4 text-muted" />
            <Modal.Header className="items-center px-6 pt-10 text-center sm:px-8">
              <span aria-hidden="true" className="mb-5 grid size-20 place-items-center rounded-full bg-success-soft text-success ring-8 ring-success/5">
                <CheckCircleIcon size={40} />
              </span>
              <Modal.Heading className="text-xl font-semibold tracking-tight">{message?.title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="px-6 pb-8 pt-3 text-center sm:px-8">
              <p className="break-words text-sm leading-relaxed text-muted">{message?.description}</p>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </FeedbackContext.Provider>
  );
}
