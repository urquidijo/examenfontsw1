import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { timeout } from 'rxjs';
import { WorkflowService } from '../../services/workflow.service';

@Component({
  selector: 'app-node-invite',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './node-invite.component.html',
})
export class NodeInviteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private workflowService = inject(WorkflowService);

  token = '';
  loading = true;
  accepting = false;

  inviteData: any = null;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';

    if (!this.token) {
      this.loading = false;
      this.errorMessage = 'Token de invitación inválido';
      return;
    }

    this.validateInvite();
  }

  validateInvite(): void {
    this.loading = true;
    this.errorMessage = '';

    this.workflowService.validateInvite(this.token)
      .pipe(timeout(8000))
      .subscribe({
        next: (res) => {
          this.inviteData = res;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error validando invitación:', error);
          this.loading = false;
          this.errorMessage = 'Invitación inválida, expirada o no disponible';
        },
      });
  }

  acceptInvite(): void {
    this.accepting = true;
    this.errorMessage = '';

    this.workflowService.acceptInvite(this.token)
      .pipe(timeout(8000))
      .subscribe({
        next: () => {
          this.successMessage = 'Invitación aceptada correctamente';

          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1200);
        },
        error: (error) => {
          console.error('Error aceptando invitación:', error);
          this.accepting = false;

          this.router.navigate(['/login'], {
            queryParams: {
              redirect: `/node-invite/${this.token}`,
            },
          });
        },
      });
  }
}