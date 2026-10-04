import { Box, Paper, Typography, Chip } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';

export function ComingSoon({ title, module }:{ title:string, module?:string }) {
  return (
    <Box sx={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <Paper sx={{ p:6, textAlign:'center', maxWidth:480 }}>
        <Box sx={{ width:64, height:64, borderRadius:'50%', bgcolor:'action.hover', display:'inline-flex', alignItems:'center', justifyContent:'center', mb:2 }}>
          <ConstructionIcon color="disabled" />
        </Box>
        <Typography variant="h6" fontWeight={800}>{title}</Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>This module is under implementation. The navigation and access control are live — content will be available soon.</Typography>
        {module && <Chip label={module} size="small" sx={{ mt:2 }} />}
      </Paper>
    </Box>
  );
}
