import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination, Box, Skeleton, Typography, Stack } from '@mui/material';

export interface Column<T> { id: string; label: string; minWidth?: number; render?: (row:T)=>React.ReactNode; sortable?: boolean }

export function DataTable<T extends {id:string}>({ columns, rows, total, page, pageSize, onPageChange, onRowsPerPageChange, loading, emptyText, onRowClick }: {
  columns: Column<T>[], rows: T[], total:number, page:number, pageSize:number,
  onPageChange:(p:number)=>void, onRowsPerPageChange:(n:number)=>void,
  loading?:boolean, emptyText?:string, onRowClick?:(r:T)=>void
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
  return (
    <Paper sx={{ overflow:'hidden' }}>
      <TableContainer sx={{ maxHeight: 520 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>{columns.map(c=> <TableCell key={c.id} sx={{ fontWeight:700, whiteSpace:'nowrap', minWidth:c.minWidth }}>{c.label}</TableCell>)}</TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row=> (
              <TableRow key={row.id} hover onClick={()=>onRowClick?.(row)} sx={{ cursor: onRowClick ? 'pointer' : 'default', '&:hover': { bgcolor:'action.hover' } }}>
                {columns.map(c=> <TableCell key={c.id}>{c.render ? c.render(row) : (row as any)[c.id]}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={total} page={page-1} rowsPerPage={pageSize} onPageChange={(_,p)=>onPageChange(p+1)} onRowsPerPageChange={(e)=>onRowsPerPageChange(parseInt(e.target.value,10))} rowsPerPageOptions={[5,10,25]} />
    </Paper>
  );
}
