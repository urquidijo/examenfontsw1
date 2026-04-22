import { Injectable } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';

export interface WorkflowRealtimePayload {
  workflowId: string;
  projectId: string;
  clientId: string;
  nodes: any[];
  edges: any[];
}

@Injectable({ providedIn: 'root' })
export class WorkflowRealtimeService {
  private client: Client | null = null;

  connect(
    wsUrl: string,
    onConnected?: () => void,
    onError?: (error: any) => void,
  ): void {
    if (this.client?.active) return;

    this.client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 3000,
      debug: () => {},
      onConnect: () => onConnected?.(),
      onStompError: (frame) => onError?.(frame),
      onWebSocketError: (event) => onError?.(event),
    });

    this.client.activate();
  }

  subscribe(
    workflowId: string,
    onMessage: (payload: WorkflowRealtimePayload) => void,
  ): StompSubscription | null {
    if (!this.client) return null;

    return this.client.subscribe(`/topic/workflows/${workflowId}`, (message: IMessage) => {
      const payload = JSON.parse(message.body) as WorkflowRealtimePayload;
      onMessage(payload);
    });
  }

  publish(workflowId: string, payload: WorkflowRealtimePayload): void {
    if (!this.client?.connected) return;

    this.client.publish({
      destination: `/app/workflows/${workflowId}/sync`,
      body: JSON.stringify(payload),
    });
  }

  disconnect(): void {
    this.client?.deactivate();
    this.client = null;
  }

  get isConnected(): boolean {
    return !!this.client?.connected;
  }
}