import { Box, Typography, Stack, Chip, IconButton, Paper, Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import { Attachment } from '../types';
import { fmtDate } from '../utils';

import { useState } from 'react';

export function FileUploader({ attachments, onAdd, onRemove, onDownload, maxMB=5, allowed=['pdf','xlsx','docx','png','jpg','jpeg'] }: {
  attachments: Attachment[], onAdd:(files:File[])=>void, onRemove:(id:string)=>void, onDownload?:(a:Attachment)=>void, maxMB?:number, allowed?:string[]
}) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const handleFiles = (files: FileList | File[]) => {
    setError(null);
    const arr = Array.from(files as any) as File[];
    const valid: File[] = [];
    for (const f of arr) {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      if (!allowed.includes(ext)) { setError(`.${ext} not allowed. Allowed: ${allowed.join(', ')}`); continue; }
      if (f.size > maxMB*1024*1024) { setError(`${f.name} exceeds ${maxMB} MB`); continue; }
      valid.push(f);
    }
    if (valid.length) onAdd(valid);
  };

  return (
    <Box>
      <Paper
        onDragOver={(e)=>{e.preventDefault(); setDragOver(true);}}
        onDragLeave={()=>setDragOver(false)}
        onDrop={(e)=>{e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files);}}
        sx={{
          p:3, border:'2px dashed', borderColor: dragOver ? 'primary.main' : 'divider',
          bgcolor: dragOver ? 'action.hover' : 'background.paper', textAlign:'center', borderRadius:2, cursor:'pointer'
        }}
        onClick={()=> document.getElementById('file-input-hidden')?.click()}
      >
        <CloudUploadIcon color="primary" sx={{ fontSize:36 }} />
        <Typography fontWeight={600} mt={1}>Drag & drop files here or click to browse</Typography>
        <Typography variant="caption" color="text.secondary">Allowed: {allowed.join(', ')} • Max {maxMB} MB each</Typography>
        <input id="file-input-hidden" type="file" hidden multiple onChange={(e)=> e.target.files && handleFiles(e.target.files)} />
      </Paper>
      {error && <Typography color="error" variant="caption" mt={1} display="block">{error}</Typography>}
      {!!attachments.length && (
        <Stack spacing={1} mt={2}>
          {attachments.map(a=> (
            <Paper key={a.id} sx={{ p:1.2, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <Box flex={1} minWidth={0}>
                <Typography variant="body2" fontWeight={600} noWrap>{a.name}</Typography>
                <Typography variant="caption" color="text.secondary">{(a.size/1024).toFixed(1)} KB • {fmtDate(a.uploadedAt)}</Typography>
              </Box>
              <Stack direction="row" spacing={0.5}>
                {onDownload && <IconButton size="small" onClick={()=>onDownload(a)} aria-label="download"><DownloadIcon fontSize="small" /></IconButton>}
                <IconButton size="small" color="error" onClick={()=>onRemove(a.id)} aria-label="remove"><DeleteIcon fontSize="small" /></IconButton>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}
