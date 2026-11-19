import { apiClient } from "../api/client";

export interface SyncTask {
  id: string;
  method: "POST" | "PATCH" | "DELETE";
  path: string;
  body?: any;
  timestamp: number;
}

const SYNC_QUEUE_KEY = "aegis_sync_queue";

export class SyncQueue {
  static getQueue(): SyncTask[] {
    try {
      const data = localStorage.getItem(SYNC_QUEUE_KEY);
      if (!data) return [];
      return JSON.parse(data) as SyncTask[];
    } catch {
      return [];
    }
  }

  static saveQueue(queue: SyncTask[]) {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  }

  static push(task: Omit<SyncTask, "id" | "timestamp">) {
    const queue = this.getQueue();
    queue.push({
      ...task,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    });
    this.saveQueue(queue);
    
    // Dispatch event so UI can show sync status
    window.dispatchEvent(new Event("aegis_sync_updated"));
  }

  static clearQueue() {
    localStorage.removeItem(SYNC_QUEUE_KEY);
    window.dispatchEvent(new Event("aegis_sync_updated"));
  }

  private static pendingFlush: Promise<void> | undefined;

  static flush(token?: string) {
    if (!this.pendingFlush) {
      this.pendingFlush = this.flushPending(token).finally(() => {
        this.pendingFlush = undefined;
      });
    }
    return this.pendingFlush;
  }

  private static async flushPending(token?: string) {
    const completed = new Set<string>();

    for (const task of this.getQueue()) {
      try {
        if (task.method === "POST") {
          await apiClient.post(task.path, task.body, token);
        } else if (task.method === "PATCH") {
          await apiClient.patch(task.path, task.body, token);
        } else {
          await apiClient.delete(task.path, token);
        }
        completed.add(task.id);
      } catch {
        console.info("[AegisNet] A queued change is still pending.");
      }
    }

    if (!completed.size) return;
    this.saveQueue(this.getQueue().filter((task) => !completed.has(task.id)));
    window.dispatchEvent(new Event("aegis_sync_updated"));
  }
}
