import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export type AlertDialogType = 'success' | 'error' | 'warning' | 'info';

export interface AlertDialogData {
  title: string;
  message: string;
  type?: AlertDialogType;
  buttonText?: string;
}

@Component({
  selector: 'app-alert-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './alert-dialog.component.html',
})
export class AlertDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<AlertDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AlertDialogData
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  get icon(): string {
    switch (this.data.type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '❌';
    }
  }

  get iconClasses(): string {
    switch (this.data.type) {
      case 'success':
        return 'bg-green-100 text-green-700';
      case 'warning':
        return 'bg-amber-100 text-amber-700';
      case 'info':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-red-100 text-red-700';
    }
  }

  get buttonClasses(): string {
    switch (this.data.type) {
      case 'success':
        return 'bg-green-600 hover:bg-green-700';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700';
      default:
        return 'bg-red-600 hover:bg-red-700';
    }
  }

  get messageLines(): string[] {
    return (this.data.message || '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.replace(/^-\s*/, ''));
  }

  get showAsList(): boolean {
    return this.messageLines.length > 1;
  }
}