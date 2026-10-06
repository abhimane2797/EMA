import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Box, Divider, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useState } from 'react';

const mdComponents = {
  a: (props: any) => <a {...props} target="_blank" rel="noreferrer" />,
  h1: (props: any) => <Typography variant="h5" sx={{ mt: 1.5, fontWeight: 700 }} {...props} />,
  h2: (props: any) => <Typography variant="h6" sx={{ mt: 1.5, fontWeight: 700 }} {...props} />,
  h3: (props: any) => <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 700 }} {...props} />,
  p: (props: any) => <Typography variant="body2" sx={{ my: 0.75, lineHeight: 1.7 }} {...props} />,
  ul: (props: any) => <Box component="ul" sx={{ my: 0.5, pl: 2.5, fontSize: 14 }} {...props} />,
  ol: (props: any) => <Box component="ol" sx={{ my: 0.5, pl: 2.5, fontSize: 14 }} {...props} />,
  li: (props: any) => <Box component="li" sx={{ mb: 0.25 }} {...props} />,
  code: (props: any) => (
    <Box component="code" sx={{ px: 0.5, py: 0.15, borderRadius: 1, bgcolor: 'grey.100', fontSize: 13, fontFamily: 'monospace' }} {...props} />
  ),
  pre: (props: any) => (
    <Box component="pre" sx={{ p: 1.25, borderRadius: 1.5, bgcolor: 'grey.900', color: 'grey.50', overflow: 'auto', fontSize: 13, my: 1 }} {...props} />
  ),
  blockquote: (props: any) => (
    <Box component="blockquote" sx={{ m: 0, pl: 1.5, borderLeft: 3, borderColor: 'divider', color: 'text.secondary', fontSize: 14 }} {...props} />
  ),
  table: (props: any) => <Box component="table" sx={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }} {...props} />,
  th: (props: any) => <Box component="th" sx={{ border: '1px solid', borderColor: 'divider', px: 1, py: 0.5, bgcolor: 'grey.100', textAlign: 'left' }} {...props} />,
  td: (props: any) => <Box component="td" sx={{ border: '1px solid', borderColor: 'divider', px: 1, py: 0.5 }} {...props} />,
};

export function Markdown({ children }: { children: string | null | undefined }) {
  if (!children) return <Typography variant="body2" color="text.disabled">No description provided.</Typography>;
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{children}</ReactMarkdown>;
}

/**
 * Write / Preview markdown editor. The preview tab also renders GitHub flavoured markdown,
 * so tables, task lists and links in ticket descriptions show up as they will be saved.
 */
export function MarkdownEditor({
  value, onChange, minRows = 4, label = 'Description', required,
}: {
  value: string;
  onChange: (v: string) => void;
  minRows?: number;
  label?: string;
  required?: boolean;
}) {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ minHeight: 32, mb: 1 }}>
        <Tab label="Write" sx={{ minHeight: 32, textTransform: 'none', fontSize: 13 }} />
        <Tab label="Preview" sx={{ minHeight: 32, textTransform: 'none', fontSize: 13 }} />
      </Tabs>
      {tab === 0 ? (
        <TextField
          fullWidth
          multiline
          minRows={minRows}
          label={label}
          required={required}
          value={value}
          onChange={e => onChange(e.target.value)}
          helperText="Markdown supported: **bold**, # heading, - list, [link](url), | table |"
          inputProps={{ 'aria-label': label }}
        />
      ) : (
        <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, minHeight: 96 }}>
          <Markdown>{value}</Markdown>
        </Box>
      )}
      <Divider sx={{ display: 'none' }} />
    </Box>
  );
}
