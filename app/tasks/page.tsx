"use client";

import { useMemo, useState } from "react";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { StatusTag } from "../../components/ui/Tag";
import { Icon } from "../../components/ui/Icon";
import { TaskForm } from "../../components/forms/TaskForm";
import { useTasks } from "../../lib/hooks/useTasks";
import { Task } from "../../lib/types/domain";
import { formatDateTime, isOverdue } from "../../lib/format";

function groupOf(task: Task): "Overdue" | "Today" | "Upcoming" | "Done" {
  if (task.done) return "Done";
  if (!task.dueAt) return "Upcoming";
  const due = new Date(task.dueAt).getTime();
  const now = Date.now();
  const DAY = 86_400_000;
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  if (due < now) return "Overdue";
  if (due < startOfToday + DAY) return "Today";
  return "Upcoming";
}

export default function TasksPage() {
  const { tasks, createTask, toggleDone } = useTasks();
  const [showForm, setShowForm] = useState(false);

  const groups = useMemo(() => {
    const buckets: Record<string, Task[]> = { Overdue: [], Today: [], Upcoming: [], Done: [] };
    tasks.forEach((t) => buckets[groupOf(t)].push(t));
    return buckets;
  }, [tasks]);

  const activeCount = tasks.filter((t) => !t.done).length;

  return (
    <div className="page">
      <PageHeader
        eyebrow="RevenueOS · Follow-ups / Tasks"
        title="Follow-ups / Tasks"
        subtitle="What needs doing, grouped by urgency, so nothing slips through."
        cta={
          <Button variant="primary" icon="plus" onClick={() => setShowForm(true)}>
            New Task
          </Button>
        }
      />

      {(["Overdue", "Today", "Upcoming"] as const).map((label) => (
        <div className="task-group" key={label}>
          <h4>
            <Icon name={label === "Overdue" ? "alert" : "clock"} size={14} />
            {label}
            <span style={{ color: "var(--faint)", fontWeight: 500 }}>({groups[label].length})</span>
          </h4>
          {groups[label].length === 0 && (
            <p style={{ color: "var(--muted)", fontSize: 12.5, padding: "4px 0 4px 2px" }}>Nothing here.</p>
          )}
          {groups[label].map((t) => (
            <div className={`task ${t.done ? "done" : ""}`} key={t.id}>
              <button
                className="cb"
                onClick={() => toggleDone(t.id, !t.done)}
                aria-label={t.done ? "Mark as not done" : "Mark as done"}
              >
                {t.done && <Icon name="check" size={14} />}
              </button>
              <div className="body">
                <div className="ttl">{t.title}</div>
                <div className="meta">
                  <span className={t.dueAt && isOverdue(t.dueAt) && !t.done ? "od" : undefined}>
                    <Icon name="clock" size={14} /> {t.dueAt ? formatDateTime(t.dueAt) : "No due date"}
                  </span>
                  <StatusTag status={t.priority} />
                  <span><Icon name="building" size={14} /> {t.linkedName}</span>
                  <span><Icon name="user" size={14} /> {t.assigneeName}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

      {groups.Done.length > 0 && (
        <div className="task-group">
          <h4>
            <Icon name="check" size={14} /> Completed
            <span style={{ color: "var(--faint)", fontWeight: 500 }}>({groups.Done.length})</span>
          </h4>
          {groups.Done.map((t) => (
            <div className="task done" key={t.id}>
              <button className="cb" onClick={() => toggleDone(t.id, false)} aria-label="Mark as not done">
                <Icon name="check" size={14} />
              </button>
              <div className="body">
                <div className="ttl">{t.title}</div>
                <div className="meta">
                  <span><Icon name="building" size={14} /> {t.linkedName}</span>
                  <span><Icon name="user" size={14} /> {t.assigneeName}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <DesignNote>
        <b>Design note.</b> Overdue always sits at the top in red. Checking a task off immediately moves
        it out of the active lists and updates the sidebar&apos;s open-task badge (currently {activeCount}).
      </DesignNote>

      {showForm && <TaskForm onClose={() => setShowForm(false)} onSubmit={createTask} />}
    </div>
  );
}
