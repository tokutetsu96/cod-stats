"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteSeriesButton({ id }: { id: string }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("このシリーズを削除しますか？（関連するゲーム・スタッツも削除されます）")) return;
    const supabase = createClient();
    await supabase.from("series").delete().eq("id", id);
    router.refresh();
  };

  return (
    <Button size="icon" variant="ghost" onClick={handleDelete}>
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
