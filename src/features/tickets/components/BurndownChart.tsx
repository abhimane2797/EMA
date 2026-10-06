import { Box, Typography } from '@mui/material';
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { SprintBurndownPoint } from '../types';
import { fmtDate } from '../../../utils';

export function BurndownChart({ points, height = 220 }: { points: SprintBurndownPoint[]; height?: number }) {
  if (!points.length) {
    return (
      <Box sx={{ height, display: 'grid', placeItems: 'center', bgcolor: 'grey.50', borderRadius: 2 }}>
        <Typography variant="caption" color="text.secondary">No burndown data yet</Typography>
      </Box>
    );
  }
  const data = points.map(p => ({ ...p, day: fmtDate(p.date).slice(0, 6) }));
  return (
    <Box sx={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -14 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            formatter={(v: any, name: string) => [`${v} pts`, name === 'ideal' ? 'Ideal' : 'Remaining']}
            labelFormatter={() => ''}
          />
          <Legend formatter={v => (v === 'ideal' ? 'Ideal' : 'Remaining')} />
          <Line type="monotone" dataKey="ideal" stroke="#8C9BAB" strokeDasharray="5 4" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="remaining" stroke="#0052CC" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
