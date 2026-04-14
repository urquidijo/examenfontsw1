import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
    this.validateInvite();
  }

  validateInvite(): void {
    this.loading = true;
    this.errorMessage = '';

    this.workflowService.validateInvite(this.token).subscribe({
      next: (res) => {
        this.inviteData = res;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Invitación inválida o expirada';
        this.loading = false;
      },
    });
  }

  acceptInvite(): void {
    this.accepting = true;
    this.errorMessage = '';

    this.workflowService.acceptInvite(this.token).subscribe({
      next: (res: any) => {
        this.successMessage = 'Invitación aceptada correctamente';

        setTimeout(() => {
          this.router.navigate(['/projects', res.projectId, 'designer']);
        }, 1200);
      },
      error: () => {
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