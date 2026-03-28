"use client";

import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { GripVertical } from "lucide-react";
import type { GameMode } from "@/lib/types";

interface StatInput {
  player_id: string;
  kills: string;
  deaths: string;
  damage: string;
  hill_time: string;
  plants: string;
  defuses: string;
  first_bloods: string;
  first_deaths: string;
  goals: string;
}

interface PlayerOption {
  id: string;
  name: string;
}

function SortableRow({
  stat,
  index,
  mode,
  playerOptions,
  selectedInOtherRows,
  onUpdate,
}: {
  stat: StatInput;
  index: number;
  mode: GameMode;
  playerOptions: PlayerOption[];
  selectedInOtherRows: Set<string>;
  onUpdate: (idx: number, u: Partial<StatInput>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `row-${index}` });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b">
      <td className="py-1 pr-1 w-8">
        <button type="button" className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="py-1 pr-1">
        <Select className="h-8 text-xs" value={stat.player_id} onChange={(e) => onUpdate(index, { player_id: e.target.value })}>
          <option value="">--</option>
          {playerOptions.filter((p) => !selectedInOtherRows.has(p.id)).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </td>
      <td className="py-1 px-1"><NumericInput value={stat.kills} onChange={(v) => onUpdate(index, { kills: v })} /></td>
      <td className="py-1 px-1"><NumericInput value={stat.deaths} onChange={(v) => onUpdate(index, { deaths: v })} /></td>
      <td className="py-1 px-1"><NumericInput value={stat.damage} onChange={(v) => onUpdate(index, { damage: v })} /></td>
      {mode === "hardpoint" && <td className="py-1 px-1"><NumericInput value={stat.hill_time} onChange={(v) => onUpdate(index, { hill_time: v })} /></td>}
      {mode === "snd" && <>
        <td className="py-1 px-1"><NumericInput value={stat.plants} onChange={(v) => onUpdate(index, { plants: v })} /></td>
        <td className="py-1 px-1"><NumericInput value={stat.defuses} onChange={(v) => onUpdate(index, { defuses: v })} /></td>
        <td className="py-1 px-1"><NumericInput value={stat.first_bloods} onChange={(v) => onUpdate(index, { first_bloods: v })} /></td>
        <td className="py-1 px-1"><NumericInput value={stat.first_deaths} onChange={(v) => onUpdate(index, { first_deaths: v })} /></td>
      </>}
      {mode === "overload" && <td className="py-1 px-1"><NumericInput value={stat.goals} onChange={(v) => onUpdate(index, { goals: v })} /></td>}
    </tr>
  );
}

export function StatsTable({
  label,
  mode,
  stats,
  playerOptions,
  onUpdate,
  onReorder,
}: {
  label: string;
  mode: GameMode;
  stats: StatInput[];
  playerOptions: PlayerOption[];
  onUpdate: (statIdx: number, updates: Partial<StatInput>) => void;
  onReorder: (oldIndex: number, newIndex: number) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = parseInt(String(active.id).replace("row-", ""));
    const newIndex = parseInt(String(over.id).replace("row-", ""));
    onReorder(oldIndex, newIndex);
  };

  const items = stats.map((_, i) => `row-${i}`);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-1 pr-1 w-8"></th>
                <th className="pb-1 pr-1 font-medium text-xs w-32">Player</th>
                <th className="pb-1 px-1 font-medium text-xs w-16">K</th>
                <th className="pb-1 px-1 font-medium text-xs w-16">D</th>
                <th className="pb-1 px-1 font-medium text-xs w-16">Dmg</th>
                {mode === "hardpoint" && <th className="pb-1 px-1 font-medium text-xs w-16">Hill</th>}
                {mode === "snd" && <>
                  <th className="pb-1 px-1 font-medium text-xs w-14">P</th>
                  <th className="pb-1 px-1 font-medium text-xs w-14">Def</th>
                  <th className="pb-1 px-1 font-medium text-xs w-14">FB</th>
                  <th className="pb-1 px-1 font-medium text-xs w-14">FD</th>
                </>}
                {mode === "overload" && <th className="pb-1 px-1 font-medium text-xs w-16">Goal</th>}
              </tr>
            </thead>
            <SortableContext items={items} strategy={verticalListSortingStrategy}>
              <tbody>
                {stats.map((stat, sIdx) => {
                  const selectedInOtherRows = new Set(stats.filter((_, i) => i !== sIdx).map((s) => s.player_id));
                  return (
                    <SortableRow
                      key={`row-${sIdx}`}
                      stat={stat}
                      index={sIdx}
                      mode={mode}
                      playerOptions={playerOptions}
                      selectedInOtherRows={selectedInOtherRows}
                      onUpdate={onUpdate}
                    />
                  );
                })}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>
    </div>
  );
}
