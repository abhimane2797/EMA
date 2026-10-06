import { Chip, Stack } from '@mui/material';
import { Label } from '@mui/icons-material';

export function LabelChips({
  labels, max = 3, size = 'small', onRemove, color = 'default',
}: {
  labels: string[];
  max?: number;
  size?: 'small' | 'medium';
  onRemove?: (label: string) => void;
  color?: 'default' | 'primary';
}) {
  if (!labels?.length) return null;
  const visible = labels.slice(0, max);
  const rest = labels.length - visible.length;
  return (
    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" alignItems="center">
      {visible.map(l => (
        <Chip
          key={l}
          size={size}
          color={color}
          variant="outlined"
          icon={onRemove ? undefined : <Label sx={{ fontSize: 13 }} />}
          label={l}
          onDelete={onRemove ? () => onRemove(l) : undefined}
          sx={{ height: size === 'small' ? 20 : 26, '& .MuiChip-label': { px: 0.75, fontSize: 11 } }}
        />
      ))}
      {rest > 0 && <Chip size="small" label={`+${rest}`} sx={{ height: 20, fontSize: 11 }} />}
    </Stack>
  );
}
