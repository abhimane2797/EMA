import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

export function ConfirmDialog({ open, title, message, confirmText='Confirm', cancelText='Cancel', onConfirm, onClose, danger=false }: {
  open:boolean, title:string, message:string, confirmText?:string, cancelText?:string, onConfirm:()=>void, onClose:()=>void, danger?:boolean
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent><Typography variant="body2" color="text.secondary">{message}</Typography></DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{cancelText}</Button>
        <Button variant="contained" color={danger ? 'error' : 'primary'} onClick={onConfirm}>{confirmText}</Button>
      </DialogActions>
    </Dialog>
  );
}
