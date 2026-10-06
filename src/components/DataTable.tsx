import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination, Box, Skeleton, Typography, Stack, Checkbox } from '@mui/material';

export interface Column<T> { id: string; label: string; minWidth?: number; render?: (row:T)=>React.ReactNode; sortable?: boolean }

export interface RowSelection<T> {
  selected: string[];
  onChange: (ids: string[]) => void;
  /** rows that cannot be selected (e.g. permission denied) */
  isSelectable?: (row: T) => boolean;
}

export function DataTable<T extends {id:string}>({ columns, rows, total, page, pageSize, onPageChange, onRowsPerPageChange, loading, emptyText, onRowClick, selection }: {
  columns: Column<T>[], rows: T[], total:number, page:number, pageSize:number,
  onPageChange:(p:number)=>void, onRowsPerPageChange:(n:number)=>void,
  loading?:boolean, emptyText?:string, onRowClick?:(r:T)=>void, selection?: RowSelection<T>
}) {
  if (loading) {
    return (
      <Paper sx={{p:2}}><Stack spacing={1}>{[1,2,3,4,5].map(i=> <Skeleton key={i} height={40} variant="rectangular" sx={{borderRadius:1}} />)}</Stack></Paper>
    );
  }
  if (!rows.length) {
    return (
      <Paper sx={{p:6, textAlign:'center'}}>
        <Typography color="text.secondary">{emptyText || 'No records found'}</Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>Try adjusting filters or create a new entry.</Typography>
      </Paper>
    );
  }

  const selectableRows = rows.filter(r => !selection || !selection.isSelectable || selection.isSelectable(r));
  const allOnPageSelected = !!selection && selectableRows.length > 0 && selectableRows.every(r => selection.selected.includes(r.id));
  const toggleRow = (row: T) => {
    if (!selection) return;
    const next = selection.selected.includes(row.id)
      ? selection.selected.filter(id => id !== row.id)
      : [...selection.selected, row.id];
    selection.onChange(next);
  };
  const toggleAll = () => {
    if (!selection) return;
    const ids = selectableRows.map(r => r.id);
    if (allOnPageSelected) selection.onChange(selection.selected.filter(id => !ids.includes(id)));
    else selection.onChange(Array.from(new Set([...selection.selected, ...ids])));
  };

  return (
    <Paper sx={{ overflow:'hidden' }}>
      <TableContainer sx={{ maxHeight: 560 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {selection && (
                <TableCell sx={{ fontWeight:700, width: 44 }} padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={allOnPageSelected}
                    indeterminate={!allOnPageSelected && selectableRows.some(r => selection.selected.includes(r.id))}
                    onChange={toggleAll}
                    inputProps={{ 'aria-label': 'Select all rows on this page' }}
                  />
                </TableCell>
              )}
              {columns.map(c=> <TableCell key={c.id} sx={{ fontWeight:700, whiteSpace:'nowrap', minWidth:c.minWidth }}>{c.label}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row=> {
              const disabled = !!selection?.isSelectable && !selection.isSelectable(row);
              return (
                <TableRow
                  key={row.id}
                  hover
                  onClick={()=> onRowClick?.(row)}
                  selected={!!selection?.selected.includes(row.id)}
                  sx={{ cursor: onRowClick ? 'pointer' : 'default', '&:hover': { bgcolor:'action.hover' }, opacity: disabled ? 0.55 : 1 }}
                >
                  {selection && (
                    <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        size="small"
                        checked={selection.selected.includes(row.id)}
                        disabled={disabled}
                        onChange={() => toggleRow(row)}
                        inputProps={{ 'aria-label': `Select ${row.id}` }}
                      />
                    </TableCell>
                  )}
                  {columns.map(c=> <TableCell key={c.id}>{c.render ? c.render(row) : (row as any)[c.id]}</TableCell>)}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Box display="flex" alignItems="center" justifyContent="space-between" px={1}>
        {selection && selection.selected.length > 0 ? (
          <Typography variant="body2" sx={{ pl: 1, py: 0.5, fontWeight: 600 }}>
            {selection.selected.length} selected
          </Typography>
        ) : <span />}
        <TablePagination component="div" count={total} page={page-1} rowsPerPage={pageSize} onPageChange={(_,p)=>onPageChange(p+1)} onRowsPerPageChange={(e)=>onRowsPerPageChange(parseInt(e.target.value,10))} rowsPerPageOptions={[5,10,25,50]} />
      </Box>
    </Paper>
  );
}
