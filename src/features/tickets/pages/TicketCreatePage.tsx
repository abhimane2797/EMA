import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';
import { TicketForm, toNumber } from '../components/TicketForm';
import { useCreateTicket } from '../api/queries';


export function TicketCreatePage() {
  const navigate = useNavigate();
  const create = useCreateTicket();

  return (
    <>
      <PageHeader
        title="Create ticket"
        subtitle="Capture a bug, task, story or incident. Markdown is supported in the description."
        breadcrumbs={[{ label: 'Tickets', to: '/tickets' }, { label: 'New ticket' }]}
      />
      <TicketForm
        saving={create.isPending}
        onCancel={() => navigate('/tickets/list')}
        onSubmit={async v => {
          const created = await create.mutateAsync({
            title: v.title,
            description: v.description,
            type: v.type as any,
            priority: v.priority as any,
            severity: v.severity as any,
            reporterId: v.reporterId,
            assigneeId: v.assigneeId || null,
            projectId: v.projectId,
            sprintId: v.sprintId || null,
            labels: v.labels,
            components: v.components,
            dueDate: v.dueDate || null,
            startDate: v.startDate || null,
            originalEstimate: toNumber(v.originalEstimate),
            remainingEstimate: toNumber(v.originalEstimate),
            storyPoints: toNumber(v.storyPoints),
            linkedTaskId: v.linkedTaskId || null,
          });
          navigate(`/tickets/${created.key}`);
        }}
      />
    </>
  );
}
