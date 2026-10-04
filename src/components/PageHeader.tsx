import { Box, Typography, Breadcrumbs, Link, Stack, Button } from '@mui/material';
import { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

export function PageHeader({ title, subtitle, breadcrumbs, action, icon }: { title:string, subtitle?:string, breadcrumbs?: {label:string, to?:string}[], action?: ReactNode, icon?: ReactNode }) {
  return (
    <Box mb={3}>
      {breadcrumbs && (
        <Breadcrumbs sx={{ mb:1, fontSize:13 }}>
          {breadcrumbs.map((b,i)=> b.to ? <Link component={RouterLink} to={b.to} key={i} underline="hover" color="inherit">{b.label}</Link> : <Typography key={i} color="text.secondary" fontSize={13}>{b.label}</Typography>)}
        </Breadcrumbs>
      )}
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {icon}
            <Typography variant="h5" fontWeight={700}>{title}</Typography>
          </Stack>
          {subtitle && <Typography variant="body2" color="text.secondary" mt={0.5}>{subtitle}</Typography>}
        </Box>
        {action}
      </Stack>
    </Box>
  );
}
