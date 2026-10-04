import { Box, Typography, Button, Paper } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

export function EmptyState({ title, description, actionLabel, onAction }: { title:string, description?:string, actionLabel?:string, onAction?:()=>void }) {
  return (
    <Paper sx={{ p:6, textAlign:'center' }}>
      <Box sx={{ width:64, height:64, borderRadius:'50%', bgcolor:'action.hover', display:'inline-flex', alignItems:'center', justifyContent:'center', mb:2 }}>
        <InboxIcon color="disabled" />
      </Box>
      <Typography fontWeight={700}>{title}</Typography>
      {description && <Typography variant="body2" color="text.secondary" mt={0.5} maxWidth={480} mx="auto">{description}</Typography>}
      {actionLabel && onAction && <Button variant="contained" sx={{mt:2}} onClick={onAction}>{actionLabel}</Button>}
    </Paper>
  );
}
