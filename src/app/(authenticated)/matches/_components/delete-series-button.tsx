"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

export function DeleteSeriesButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("このシリーズを削除しますか？（関連するゲーム・スタッツも削除されます）")) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("series").delete().eq("id", id);
    router.refresh();
    setLoading(false);
  };

  return (
    <Button size="icon" variant="ghost" onClick={handleDelete} disabled={loading}>
      {loading ? <Spinner /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}
