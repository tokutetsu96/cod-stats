"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

export function DeleteSeriesButton({ id, isAdmin }: { id: string; isAdmin: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!isAdmin) return;
    if (!confirm("このシリーズを削除しますか？（関連するゲーム・スタッツも削除されます）")) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("series").delete().eq("id", id);
    if (error) {
      alert("削除に失敗しました");
      setLoading(false);
      return;
    }
    router.refresh();
    setLoading(false);
  };

  return (
    <Button size="icon" variant="ghost" onClick={handleDelete} disabled={loading}>
      {loading ? <Spinner /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}
