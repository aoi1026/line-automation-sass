"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TemplateFormDialog } from "./template-form-dialog";

/** テンプレート新規作成ボタン（ダイアログを開く） */
export function CreateTemplateButton({ storeName }: { storeName: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" />
        テンプレートを作成
      </Button>
      <TemplateFormDialog
        open={open}
        onOpenChange={setOpen}
        storeName={storeName}
      />
    </>
  );
}
